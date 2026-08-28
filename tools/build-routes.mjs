#!/usr/bin/env node
/**
 * Bake real road geometry into a route file, once.
 *
 *   node tools/build-routes.mjs data/routes/southwest-loop.json
 *
 * For every day it asks the free OSRM demo server for the driving route
 * from -> (via) -> to, and writes the result into that day's "route" array.
 * The website then draws the real roads without ever calling OSRM itself.
 *
 * Points of interest deliberately do NOT steer the route — they are places you
 * stop at, not waypoints you thread through, and routing via them distorts the
 * driving line badly. Use a day's optional "via" array to force a detour.
 *
 * An option can override a single day with its own "dayVia", for a vehicle that
 * has to go a different way (the motorhome cannot use the Zion tunnel). Those
 * baked overrides land in that option's "dayRoutes".
 *
 * Days that already have geometry are skipped unless you pass --force.
 * If a day fails it is left alone and the site falls back to a dashed straight
 * line. Safe to re-run.
 */
import { readFile, writeFile } from 'node:fs/promises';

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const MAX_POINTS = 300;      // keep the JSON small enough for a phone
const PAUSE_MS = 1200;       // be polite to the free demo server

const args = process.argv.slice(2);
const force = args.includes('--force');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('usage: node tools/build-routes.mjs <data/routes/FILE.json> [--force]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isCoord = (c) => Array.isArray(c) && c.length >= 2 &&
  Number.isFinite(c[0]) && Number.isFinite(c[1]);

/** Keep at most MAX_POINTS, always keeping the first and last. */
function downsample(points) {
  if (points.length <= MAX_POINTS) return points;
  const step = (points.length - 1) / (MAX_POINTS - 1);
  const out = [];
  for (let i = 0; i < MAX_POINTS; i++) out.push(points[Math.round(i * step)]);
  out[out.length - 1] = points[points.length - 1];
  return out;
}

/** Round to 5 decimals (~1 m) so the file does not balloon. */
const round = ([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))];

async function routeFor(waypoints) {
  const path = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM}${path}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'roadtrip-site/1.0' } });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const json = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length) throw new Error(`OSRM said ${json.code}`);
  const coords = json.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return {
    route: downsample(coords).map(round),
    miles: json.routes[0].distance / 1609.344
  };
}

/** from -> via -> to. Returns null when there is no leg worth drawing. */
function waypointsFor(day, via) {
  const pts = [];
  if (isCoord(day.from?.coords)) pts.push(day.from.coords);
  for (const v of via ?? day.via ?? []) if (isCoord(v)) pts.push(v);
  if (isCoord(day.to?.coords)) pts.push(day.to.coords);
  if (pts.length < 2) return null;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  if (pts.length === 2 && a[0] === b[0] && a[1] === b[1]) return null;
  return pts;
}

const route = JSON.parse(await readFile(file, 'utf8'));
let changed = 0;

/* ---- the shared itinerary ---- */
for (const day of route.days ?? []) {
  const n = day.day ?? '?';
  if (Array.isArray(day.route) && day.route.length >= 2 && !force) {
    console.log(`day ${n}: already has a route, skipping (use --force to redo)`);
    continue;
  }
  const pts = waypointsFor(day);
  if (!pts) {
    console.log(`day ${n}: no leg to draw (starts and ends in the same place)`);
    continue;
  }
  try {
    const { route: geom, miles } = await routeFor(pts);
    day.route = geom;
    changed++;
    console.log(`day ${n}: ${geom.length} points (OSRM ${Math.round(miles)} mi` +
      `${day.miles ? `, file says ${day.miles} mi` : ''})`);
  } catch (err) {
    console.warn(`day ${n}: ${err.message} — leaving it as a straight line`);
  }
  await sleep(PAUSE_MS);
}

/* ---- per-option detours ---- */
for (const opt of route.options ?? []) {
  const vias = opt.dayVia ?? {};
  for (const [dayNum, via] of Object.entries(vias)) {
    opt.dayRoutes ??= {};
    if (Array.isArray(opt.dayRoutes[dayNum]) && !force) {
      console.log(`${opt.id} day ${dayNum}: already has a detour, skipping`);
      continue;
    }
    const day = (route.days ?? []).find((d) => String(d.day) === String(dayNum));
    if (!day) { console.warn(`${opt.id} day ${dayNum}: no such day`); continue; }
    const pts = waypointsFor(day, via);
    if (!pts) continue;
    try {
      const { route: geom, miles } = await routeFor(pts);
      opt.dayRoutes[dayNum] = geom;
      changed++;
      console.log(`${opt.id} day ${dayNum}: ${geom.length} points (OSRM ${Math.round(miles)} mi via the detour)`);
    } catch (err) {
      console.warn(`${opt.id} day ${dayNum}: ${err.message} — falling back to the shared route`);
    }
    await sleep(PAUSE_MS);
  }
}

if (changed) {
  await writeFile(file, JSON.stringify(route, null, 2) + '\n');
  console.log(`\nwrote ${changed} route${changed === 1 ? '' : 's'} into ${file}`);
} else {
  console.log('\nnothing changed');
}
