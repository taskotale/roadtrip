#!/usr/bin/env node
/**
 * Pull freely-licensed candidate photos off Wikimedia Commons.
 *
 *   node tools/fetch-commons.mjs <out-dir> <slug> "<search terms>" [count]
 *   node tools/fetch-commons.mjs <out-dir> <slug> "cat:Category:Amboy, California" [count]
 *
 * A "cat:" prefix lists a Commons category instead of searching. For a named
 * place that is nearly always the better source — a free-text search for
 * "Roy's Motel" returns hummingbirds and hotel signs from other states.
 *
 * Downloads up to <count> candidates at 1200px wide into <out-dir>/<slug>/ and
 * writes <out-dir>/<slug>/meta.json with the author, licence and source page
 * for each one — the four columns CREDITS.md needs.
 *
 * Only public-domain, CC0, CC BY and CC BY-SA files are kept. Everything else
 * (fair use, no licence stated, non-commercial) is dropped.
 *
 * These are CANDIDATES, not accepted photos. Commons searches return decoys,
 * aerials where the landmark is unrecognisable, and shots through car windows.
 * Look at every one before you use it.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'roadtrip-site/1.0 (https://taskotale.github.io/roadtrip/)';

const OK_LICENCE = /^(cc[ -]?by(-sa)?([ -][\d.]+)?|cc0|public domain|pd(-|$)|cc[ -]?pd)/i;
const BAD_LICENCE = /(non-?commercial|\bnc\b|\bnd\b|no ?deriv|fair use|copyright)/i;

const [outDir, slug, terms, countArg] = process.argv.slice(2);
if (!outDir || !slug || !terms) {
  console.error('usage: node tools/fetch-commons.mjs <out-dir> <slug> "<search>" [count]');
  process.exit(1);
}
const want = Number(countArg || 8);

const strip = (html) => (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const byCategory = terms.startsWith('cat:');
const params = new URLSearchParams(byCategory
  ? { action: 'query', format: 'json', generator: 'categorymembers',
      gcmtitle: terms.slice(4), gcmtype: 'file', gcmlimit: String(want * 8),
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1200' }
  : { action: 'query', format: 'json', generator: 'search',
      gsrsearch: `filetype:bitmap ${terms}`, gsrnamespace: '6', gsrlimit: String(want * 3),
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1200' });

const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } });
const json = await res.json();
const pages = Object.values(json.query?.pages || {});
if (!pages.length) console.warn(`  ${slug}: nothing came back for ${terms}`);

const dir = `${outDir}/${slug}`;
await mkdir(dir, { recursive: true });

const kept = [];
for (const p of pages) {
  if (kept.length >= want) break;
  const ii = p.imageinfo?.[0];
  if (!ii) continue;
  const em = ii.extmetadata || {};
  const licence = strip(em.LicenseShortName?.value) || strip(em.UsageTerms?.value);
  if (!licence || BAD_LICENCE.test(licence) || !OK_LICENCE.test(licence)) continue;
  if (ii.width < 800) continue;

  const n = kept.length + 1;
  const file = `${dir}/${slug}-c${n}.jpg`;
  let saved = false;
  /* Commons rate-limits hard when you pull a lot in a row. Back off and retry
     rather than silently ending up with two photos for a headline landmark. */
  for (let attempt = 1; attempt <= 4 && !saved; attempt++) {
    try {
      const img = await fetch(ii.thumburl || ii.url, { headers: { 'User-Agent': UA } });
      if (img.status === 429) { await new Promise((r) => setTimeout(r, attempt * 8000)); continue; }
      if (!img.ok) throw new Error(`HTTP ${img.status}`);
      await writeFile(file, Buffer.from(await img.arrayBuffer()));
      saved = true;
    } catch (err) {
      if (attempt === 4) console.warn(`  skip ${p.title}: ${err.message}`);
      else await new Promise((r) => setTimeout(r, attempt * 4000));
    }
  }
  if (!saved) continue;

  kept.push({
    candidate: `${slug}-c${n}.jpg`,
    title: p.title.replace(/^File:/, ''),
    author: strip(em.Artist?.value) || 'Unknown',
    licence,
    source: 'https://commons.wikimedia.org/wiki/File:' +
            encodeURIComponent(p.title.replace(/^File:/, '').replace(/ /g, '_')),
    description: strip(em.ImageDescription?.value).slice(0, 200),
    original: `${ii.width}x${ii.height}`
  });
  await new Promise((r) => setTimeout(r, 900));
}

await writeFile(`${dir}/meta.json`, JSON.stringify(kept, null, 2) + '\n');
console.log(`${slug}: ${kept.length} candidate${kept.length === 1 ? '' : 's'}`);
kept.forEach((k) => console.log(`  ${k.candidate}  ${k.licence.padEnd(14)} ${k.title.slice(0, 62)}`));
