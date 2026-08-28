#!/usr/bin/env node
/**
 * Bake real road geometry into an option file, once.
 *
 *   node tools/build-routes.mjs data/options/demo-southwest.json
 *
 * For every day it asks the free OSRM demo server for the driving route
 * from -> (via) -> to, and writes the result into that day's "route" array.
 * The website then draws the real roads without ever calling OSRM itself.
 *
 * Points of interest deliberately do NOT steer the route — they are places you
 * stop at, not waypoints you thread through, and routing via them distorts the
 * driving line badly. Use a day's optional "via" array to force a detour (for
 * example the motorhome's long way round Zion, avoiding the tunnel).
 *
 * Days that already have a "route" are skipped unless you pass --force.
 * If a day fails, it is left alone and the site falls back to a dashed
 * straight line for that day. Safe to re-run.
 */
import { readFile, writeFile } from 'node:fs/promises';

const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const MAX_POINTS = 300;      // keep the JSON small enough for a phone
const PAUSE_MS = 1200;       // be polite to the free demo server

const args = process.argv.slice(2);
const force = args.includes('--force');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('usage: node tools/build-routes.mjs <data/options/FILE.json> [--force]');
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
    miles: json.routes[0].distance / 1609.344,
    minutes: json.routes[0].duration / 60
  };
}

const option = JSON.parse(await readFile(file, 'utf8'));
let changed = 0;

for (const day of option.days ?? []) {
  const n = day.day ?? '?';

  if (Array.isArray(day.route) && day.route.length >= 2 && !force) {
    console.log(`day ${n}: already has a route, skipping (use --force to redo)`);
    continue;
  }

  const waypoints = [];
  if (isCoord(day.from?.coords)) waypoints.push(day.from.coords);
  for (const v of day.via ?? []) if (isCoord(v)) waypoints.push(v);
  if (isCoord(day.to?.coords)) waypoints.push(day.to.coords);

  if (waypoints.length < 2) {
    console.log(`day ${n}: not enough coordinates, skipping`);
    continue;
  }

  /* A day that starts and ends in the same place has no drive line to draw. */
  const [a, b] = [waypoints[0], waypoints[waypoints.length - 1]];
  if (waypoints.length === 2 && a[0] === b[0] && a[1] === b[1]) {
    console.log(`day ${n}: starts and ends in the same place, no route needed`);
    continue;
  }

  try {
    const { route, miles, minutes } = await routeFor(waypoints);
    day.route = route;
    changed++;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    console.log(
      `day ${n}: ${route.length} points  ` +
      `(OSRM says ${Math.round(miles)} mi / ${h}h ${m}m via the listed stops` +
      `${day.miles ? `, file says ${day.miles} mi` : ''})`
    );
  } catch (err) {
    console.warn(`day ${n}: ${err.message} — leaving it as a straight line`);
  }

  await sleep(PAUSE_MS);
}

if (changed) {
  await writeFile(file, JSON.stringify(option, null, 2) + '\n');
  console.log(`\nwrote ${changed} route${changed === 1 ? '' : 's'} into ${file}`);
} else {
  console.log('\nnothing changed');
}
