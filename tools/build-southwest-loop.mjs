#!/usr/bin/env node
/* Rebuilds data/routes/southwest-loop.json from source/rv-trip-data.json.
   Run from the repo root:
       node tools/build-southwest-loop.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/southwest-loop.json

   This is specific to the Southwest Loop — the itinerary text, the day flags and
   the stop list are all written out below. It is kept as the record of how that
   route file was produced, and as a worked example to copy for a new route.
   A new route does not have to be built this way: hand-writing the JSON against
   the schema in README.md is perfectly fine, and simpler for a one-off. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

/* Paths are relative to the repo root, which is one level up from tools/. */
const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PHOTO = 'assets/photos/southwest-loop';

const src = JSON.parse(await readFile(`${SITE}/source/rv-trip-data.json`, 'utf8'));
const C = JSON.parse(await readFile(process.argv[2] || `${SITE}/source/coords.json`, 'utf8'));

const at = (key) => {
  const p = C[key];
  if (!p) throw new Error('missing coordinate for ' + key);
  return [p.lat, p.lng];
};
const place = (name, key) => ({ name, coords: at(key) });

/* Every file in the photo folder, so a point of interest can pick up its
   numbered variants (foo.jpg, foo-2.jpg, foo-3.jpg …) without being listed
   twice. Drop a new foo-5.jpg in and it appears in the viewer on next build. */
const photoFiles = new Set(await readdir(`${SITE}/${PHOTO}`));

const poi = (name, key, photo, caption) => {
  const base = photo.replace(/\.jpg$/, '');
  const shots = [];
  if (photoFiles.has(photo)) shots.push({ src: `${PHOTO}/${photo}`, caption: caption || '' });
  for (let n = 2; n <= 12; n++) {
    const f = `${base}-${n}.jpg`;
    if (photoFiles.has(f)) shots.push({ src: `${PHOTO}/${f}` });
    else if (n > 2) break;
  }
  return {
    name, coords: at(key),
    ...(caption ? { caption } : {}),
    ...(shots.length ? { photos: shots } : {})
  };
};

const STOPS = {
  1:  ['las-vegas', 'furnace-creek'],      2:  ['furnace-creek', 'furnace-creek'],
  3:  ['furnace-creek', 'furnace-creek'],  4:  ['furnace-creek', 'valley-of-fire'],
  5:  ['valley-of-fire', 'springdale'],    6:  ['springdale', 'springdale'],
  7:  ['springdale', 'page'],              8:  ['page', 'monument-valley'],
  9:  ['monument-valley', 'monument-valley'], 10: ['monument-valley', 'grand-canyon-village'],
  11: ['grand-canyon-village', 'grand-canyon-village'], 12: ['grand-canyon-village', 'kingman'],
  13: ['kingman', 'las-vegas'],            14: ['las-vegas', 'las-vegas-airport']
};

const POIS = {
  1: [poi("Zabriskie Point", 'zabriskie-point', 'zabriskie-point.jpg',
       'Golden badlands at sunset, ten minutes from Furnace Creek.')],
  2: [poi("Badwater Basin", 'badwater-basin', 'badwater-basin.jpg',
       'The lowest point in North America — 282 ft below sea level.'),
      poi("Golden Canyon", 'golden-canyon', 'golden-canyon.jpg',
       'An easy walk up a narrow canyon straight off the valley floor.'),
      poi("Artist's Drive", 'artists-drive', 'artists-drive.jpg',
       'A one-way loop through mineral-stained hills.')],
  3: [poi("Mesquite Flat Dunes", 'mesquite-flat-dunes', 'mesquite-flat-dunes.jpg',
       'Best at sunrise before the wind picks up.'),
      poi("Ubehebe Crater", 'ubehebe-crater', 'ubehebe-crater.jpg',
       'A half-mile-wide volcanic crater — but a 110-mile round trip.'),
      poi("Dante's View", 'dantes-view', 'dantes-view.jpg',
       '5,475 ft up, looking straight down at Badwater. Can be 14°C colder.')],
  4: [poi("Valley of Fire", 'valley-of-fire', 'valley-of-fire.jpg',
       "Nevada's oldest state park, and bright red the whole way through."),
      poi("Fire Wave", 'fire-wave', 'fire-wave.jpg',
       'Striped Aztec sandstone, a short walk that suits kids.'),
      poi("Atlatl Rock", 'atlatl-rock', 'atlatl-rock.jpg',
       'Petroglyphs up a steel staircase.')],
  5: [poi("Zion Canyon Scenic Drive", 'zion-canyon', 'zion-canyon.jpg',
       'In winter the shuttle stops running, so you can drive it yourself.')],
  6: [poi("Zion–Mount Carmel Highway", 'mount-carmel-highway', 'mt-carmel-highway.jpg',
       'Switchbacks and the 1930 tunnel to the east side of the park.')],
  7: [poi("Wahweap Overlook", 'lake-powell-wahweap', 'lake-powell.jpg',
       'Lake Powell and the Glen Canyon Dam at the end of a long day.')],
  8: [poi("Horseshoe Bend", 'horseshoe-bend', 'horseshoe-bend.jpg',
       '$10 per vehicle, a 1.5-mile round-trip walk. No tour, no permit.'),
      poi("Wire Pass", 'wire-pass', 'wire-pass.jpg',
       'Optional $6pp detour into a real slot canyon you walk yourself.'),
      poi("Monument Valley at sunset", 'monument-valley-mittens', 'monument-valley-mittens.jpg',
       'The Mittens as you arrive.')],
  9: [poi("Tribal Park Loop", 'john-fords-point', 'monument-valley-loop.jpg',
       "The 17-mile unpaved loop drive. John Ford's Point is the classic stop."),
      poi("Wildcat Trail", 'monument-valley-mittens', 'wildcat-trail.jpg',
       'A free 3.2-mile loop around West Mitten Butte. Open to everyone.')],
  10: [poi("Desert View Watchtower", 'desert-view-watchtower', 'desert-view-watchtower.jpg',
        'The east entrance. Your first look at the canyon, and the best one.'),
       poi("Yavapai Point", 'yavapai-point', 'yavapai-point.jpg',
        'Sunset, with a heated geology museum behind you.')],
  11: [poi("Mather Point", 'mather-point', 'mather-point.jpg',
        'Sunrise spot, right by the visitor center.'),
       poi("Bright Angel Trailhead", 'bright-angel-trailhead', 'bright-angel-trail.jpg',
        'Go down as far as the 1.5-mile resthouse, then turn around.')],
  12: [poi("Seligman", 'seligman', 'seligman-route66.jpg',
        'Where the Route 66 revival started. Milkshakes and old cars.'),
       poi("Kingman", 'kingman', 'kingman-route66.jpg',
        'End of the longest intact original stretch of Route 66.')],
  13: [poi("Hoover Dam", 'hoover-dam', 'hoover-dam.jpg',
        'Park and walk out onto the bridge — 20 minutes, no ticket needed.')],
  14: []
};

/* The pick of the trip, shown as a gallery near the top of the route page. */
const MUST_SEE = [
  ['Zabriskie Point', 1, 'zabriskie-point.jpg',
   'Golden badlands at sunset, ten minutes from where you sleep. The best view in Death Valley for the least effort.'],
  ['Badwater Basin', 2, 'badwater-basin.jpg',
   'The lowest point in North America, 282 ft below sea level. Walk out onto the salt flats.'],
  ['Mesquite Flat Dunes', 3, 'mesquite-flat-dunes.jpg',
   'Go at sunrise. Dunes the kids can run down, before the wind picks up and the light goes flat.'],
  ['Fire Wave', 4, 'fire-wave.jpg',
   'Striped red and white sandstone at the end of a short flat walk. Valley of Fire in a single stop.'],
  ['Zion Canyon Scenic Drive', 5, 'zion-canyon.jpg',
   'In January the shuttle stops running and you drive the canyon yourself — a road closed to private cars most of the year.'],
  ['Horseshoe Bend', 8, 'horseshoe-bend.jpg',
   '$10 for the whole vehicle and a 1.5-mile walk. Does what a $580 Antelope Canyon tour does, for a sixtieth of the price.'],
  ['The Mittens at sunrise', 9, 'monument-valley-mittens.jpg',
   'If you splurge once on this trip, splurge on a room that faces these.'],
  ['Desert View Watchtower', 10, 'desert-view-watchtower.jpg',
   'Coming in from the east means this is your first sight of the Grand Canyon. It is the best one there is.'],
  ['Sunrise at Mather Point', 11, 'mather-point.jpg',
   'Snow on the rim over red rock, and the park as empty as it gets all year.'],
  ['Seligman, Route 66', 12, 'seligman-route66.jpg',
   'Where the Route 66 revival started. Milkshakes and old cars — this is the one the kids will talk about.']
].map(([name, day, photo, why]) => ({ name, day, photo: `${PHOTO}/${photo}`, why }));

const pn = src.practical_notes;

/* Things that will bite you if nobody reads them. `only` limits one to a single option. */
const WATCH_OUTS = [
  { title: 'Book these three first, then everything else',
    text: pn.booking_order },
  { title: 'Seven nights at or below freezing',
    text: pn.cold_weather },
  { title: 'Freeze damage is charged to you',
    text: pn.rental_freeze_risk, only: 'motorhome' },
  { title: 'Death Valley is still closing roads',
    text: pn.death_valley_closures },
  { title: 'Fill up before you drive in',
    text: pn.fuel },
  { title: 'The park pass does not cover everything',
    text: 'The America the Beautiful pass covers Death Valley, Zion, the Grand Canyon and Glen Canyon. It does not cover Monument Valley, which is a Navajo tribal park ($8 per person), or Valley of Fire, which is a Nevada state park.' },
  { title: 'Price the unlimited-miles package',
    text: pn.mileage_fees },
  { title: 'Day 13 is the weather buffer',
    text: pn.buffer }
];

const ROUTE_PROS = [
  'Five national parks and a Navajo tribal park in one loop, out and back from a single airport.',
  'January is the emptiest month of the year at the Grand Canyon, and Springdale and Page are both cheap in low season.',
  'Short days: 118 miles a day on average, and five of the fourteen days involve no driving between towns at all.',
  'Winter opens Zion Canyon Scenic Drive to private vehicles — the park shuttle does not run, so you drive it yourself.',
  'The warm end of the trip comes first. Death Valley around 18°C while you settle in, before the cold middle.',
  'One set of flights, one vehicle, one loop. Nothing is one-way.'
];

const ROUTE_CONS = [
  'Seven nights at or below freezing once you climb to Zion, Page, Monument Valley and the Grand Canyon.',
  'Snow at the Grand Canyon can cost a day. Day 13 is deliberately short to absorb that.',
  'Death Valley still has flood damage: Scotty\'s Castle and Bonnie Clare Road are closed indefinitely, and several roads have soft shoulders and unpaved sections.',
  'Day 12 is a 200-mile, 4h30 push from the Grand Canyon to Kingman. It is the longest day of the trip.',
  'Two of the best stops are not covered by the park pass, and Monument Valley charges per person.',
  'Bryce Canyon is skipped on purpose — it sits at 8,000 ft and is genuinely miserable in January.'
];

/* Per-option annotations on individual days. */
const FLAGS = {
  motorhome: {
    2: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "Artist's Drive is closed to vehicles over 25 ft. Take the separate rental car — it is in the budget for exactly this." }],
    3: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "The final climb to Dante's View has the same 25 ft limit. Rental car again." }],
    5: [{ type: 'note', label: 'First freezing night.',
          text: 'Run the propane furnace, not the heat pump — heat pumps stop working around 4°C. Disconnect the city water hose at night and run off the fresh tank; the hose freezes long before the tanks do.' }],
    6: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: 'Mount Carmel Highway is closed to anything over 35 ft 9 in long, 7 ft 10 in wide or 11 ft 4 in high. Every Class C is about 8 ft wide and 12 ft tall, so a smaller one does not help — the whole east side of Zion is out, Canyon Overlook Trail and Checkerboard Mesa included. As of June 2026 the oversized-vehicle escort was scrapped entirely: no permit, no escort, no exception.' }],
    7: [{ type: 'blocked', label: 'This is why it is 200 miles.',
          text: 'The direct route through the Zion tunnel is closed to you, so the day goes round via Hurricane, Colorado City and Kanab. The map shows the long way.' }],
    9: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: 'The Navajo Nation bars RVs from the 17-mile loop by category, not by size. What you can still do for free: the visitor center overlook and the 3.2-mile Wildcat Trail. A Navajo-guided 4x4 tour runs $70–95 each.' }],
    11: [{ type: 'note', label: 'Coldest night of the trip.',
           text: 'Highs around 5°C, lows around −8°C. Full hookups are available at Trailer Village — book it first, it sets the skeleton of the whole trip.' }]
  },
  'car-and-lodging': {
    2: [{ type: 'unlocked', label: 'Open to you:',
          text: "Artist's Drive, with no second rental car needed." }],
    3: [{ type: 'unlocked', label: 'Open to you:',
          text: "The climb to Dante's View, 5,475 ft up over Badwater." }],
    6: [{ type: 'unlocked', label: 'Open to you:',
          text: 'Mount Carmel Highway and the whole east side of Zion — Canyon Overlook Trail and Checkerboard Mesa. One of the three places the motorhome cannot go.' }],
    7: [{ type: 'unlocked', label: 'Shorter if you want it:',
          text: 'The 200 miles below is the motorhome routing round via Kanab. In a car you go straight through Mount Carmel Highway instead — about 120 miles, and the better drive. The map shows the direct route.' }],
    9: [{ type: 'unlocked', label: 'Open to you:',
          text: 'Drive the 17-mile Tribal Park Loop yourself — included in the tribal park entry, no guide needed.' }]
  }
};

/* The motorhome is banned from the Zion tunnel, so its day 7 goes the long way. */
const RV_DAY7_DETOUR = [
  [37.17530, -113.28990],  // Hurricane, UT
  [36.99030, -112.97690],  // Colorado City, AZ
  [37.04750, -112.52630]   // Kanab, UT
];

const days = src.itinerary.map((d) => {
  const [fromKey, toKey] = STOPS[d.day];
  const day = {
    day: d.day,
    from: place(d.from, fromKey),
    to: place(d.to, toKey),
    miles: d.miles,
    headline: d.headline,
    notes: d.notes,
    elevation: d.elevation_ft,
    freezingNight: !!d.freezing_night,
    activities: d.activities || [],
    pois: POIS[d.day] || []
  };
  if (d.drive_time) {
    day.driveTime = d.drive_time.replace(/^(\d+)h(\d+)$/, (_, h, m) => m === '00' ? `${h}h` : `${h}h ${m}m`);
  }
  return day;
});

const o1 = src.options.find((o) => o.id === 'option-1');
const o2 = src.options.find((o) => o.id === 'option-2');
const party = src.trip.party_size;

/* The source's stated totals are $1 off its own line items (rounding). Derive
   the totals from the lines so the table on screen always adds up. The site
   shows totals only — the kids are not paying, and one person dropping out
   would not move the number much, so a per-head figure would mislead. */
const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);

const motorhome = {
  id: 'motorhome',
  name: o1.name,
  tagline: o1.tagline,
  summary: 'Transport and lodging in one vehicle, so there is nothing to book at six separate stops and you cook instead of eating out — but seven nights below freezing, and three places on this route it simply cannot go.',
  vehicle: {
    type: o1.vehicle.type,
    detail: `${o1.vehicle.example} · sleeps ${o1.vehicle.sleeps} · ${o1.vehicle.seatbelts} seatbelts · ${o1.vehicle.dimensions.length_ft} ft long, ${o1.vehicle.dimensions.width_ft.toFixed(2)} ft wide, ${o1.vehicle.dimensions.height_ft} ft high`,
    notes: o1.vehicle.notes
  },
  costs: {
    currency: o1.budget.currency,
    columns: [{ key: 'low', label: 'Low' }, { key: 'high', label: 'High' }],
    totals: { low: sumLines(o1.budget.lines, 'low'), high: sumLines(o1.budget.lines, 'high') },
    lines: o1.budget.lines.map((l) => ({ item: l.item, low: l.low, high: l.high, basis: l.basis })),
    notes: 'Everything for six people for fourteen days, flights included. The America the Beautiful pass is already owned, so park entry is zero — but it does not cover Monument Valley or Valley of Fire.'
  },
  pros: o1.pros,
  cons: o1.cons,
  flags: FLAGS.motorhome,
  dayVia: { 7: RV_DAY7_DETOUR }
};

/* Option 2 is quoted as two builds rather than a range. The lines below are the
   ones the source states; "Everything else" is the remainder up to each quoted
   total, so both columns add up to the figure they are headed by. */
const flights = o1.budget.lines.find((l) => l.item === 'Flights');
const tribal = o1.budget.lines.find((l) => l.item.includes('Monument Valley'));
const d = o2.budget_deltas;
const valueBuild = o2.builds.find((b) => b.id === 'value');
const locBuild = o2.builds.find((b) => b.id === 'location');

const carLines = [
  { item: 'Flights', value: flights.low, location: flights.high, basis: flights.basis },
  { item: 'Vehicle rental', value: o2.vehicle.cost_low, location: o2.vehicle.cost_high, basis: o2.vehicle.notes },
  { item: 'Fuel', value: d.fuel.low, location: d.fuel.high, basis: d.fuel.basis },
  { item: 'Lodging', value: d.lodging.value, location: d.lodging.location, basis: d.lodging.basis },
  { item: 'Food', value: d.food.low, location: d.food.high, basis: d.food.basis },
  { item: 'Monument Valley tribal entry', value: tribal.low, location: tribal.high, basis: tribal.basis },
  { item: 'Park entry fees', value: 0, location: 0, basis: 'America the Beautiful annual pass already owned' }
];
const sum = (k) => carLines.reduce((t, l) => t + l[k], 0);
carLines.push({
  item: 'Everything else',
  value: valueBuild.total - sum('value'),
  location: locBuild.total - sum('location'),
  basis: 'The remainder up to the quoted total — activities, parking, tolls and incidentals.'
});

const car = {
  id: 'car-and-lodging',
  name: o2.name,
  tagline: o2.tagline,
  summary: 'A seven-seater and a room every night. It costs meaningfully more, and almost all of the gap is food and lodging — but nobody sleeps below freezing, and it opens up three places on this route the motorhome is barred from.',
  vehicle: {
    type: o2.vehicle.type,
    detail: `${o2.vehicle.examples.join(' · ')} · ${o2.vehicle.seats} seats`,
    notes: o2.vehicle.notes
  },
  costs: {
    currency: 'USD',
    columns: [{ key: 'value', label: valueBuild.name }, { key: 'location', label: locBuild.name }],
    totals: { value: valueBuild.total, location: locBuild.total },
    lines: carLines,
    notes: 'Two versions of the same trip. "Best value" sleeps in Beatty rather than inside Death Valley, which alone saves close to $1,000 over three nights — the single biggest lever in the whole budget. "Best location" puts you inside the parks and at The View in Monument Valley.'
  },
  pros: o2.pros,
  cons: o2.cons,
  flags: FLAGS['car-and-lodging']
};

const route = {
  id: 'southwest-loop',
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/monument-valley-mittens.jpg`,
  season: src.trip.season,
  startEnd: src.trip.start_end,
  totals: {
    days: src.trip.duration_days,
    miles: src.trip.total_miles,
    party,
    avgMilesPerDay: src.trip.avg_miles_per_day
  },
  mustSee: MUST_SEE,
  watchOuts: WATCH_OUTS,
  pros: ROUTE_PROS,
  cons: ROUTE_CONS,
  notConsidered: src.rejected_alternatives.map((r) => ({ place: r.place, reason: r.reason })),
  moneySavers: src.money_savers.map((m) => ({
    item: m.item, amount: m.saving || m.cost || '', detail: m.detail
  })),
  options: [motorhome, car],
  days
};

await mkdir(`${SITE}/data/routes`, { recursive: true });
await writeFile(`${SITE}/data/routes/southwest-loop.json`, JSON.stringify(route, null, 2) + '\n');
/* Add this route to the manifest without disturbing the ones already there —
   rebuilding one route must not drop the others off the home screen. */
const manifestPath = `${SITE}/data/manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"routes":[]}'));
if (!manifest.routes.includes('routes/southwest-loop.json')) manifest.routes.unshift('routes/southwest-loop.json');
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

/* ---- checks ---- */
let bad = 0;
route.options.forEach((opt) => {
  const c = opt.costs;
  c.columns.forEach((col) => {
    const s = sumLines(c.lines, col.key);
    if (s !== c.totals[col.key]) { bad++; console.log(`  !! ${opt.id} ${col.key}: ${s} vs ${c.totals[col.key]}`); }
  });
});
console.log('route     :', route.name);
console.log('days      :', route.days.length, '| must-see:', route.mustSee.length,
  '| watch-outs:', route.watchOuts.length, '| pros/cons:', route.pros.length + '/' + route.cons.length);
console.log('options   :', route.options.map((o) => `${o.name} (${Object.keys(o.flags).length} day flags)`).join(', '));
console.log('costs     :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
