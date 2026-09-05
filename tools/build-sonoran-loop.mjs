#!/usr/bin/env node
/* Rebuilds data/routes/sonoran-loop.json from source/sonoran-trip-data.json.
   Run from the repo root:
       node tools/build-sonoran-loop.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/sonoran-loop.json

   Same shape as tools/build-southwest-loop.mjs. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ID = 'sonoran-loop';
const PHOTO = `assets/photos/${ID}`;

const src = JSON.parse(await readFile(`${SITE}/source/sonoran-trip-data.json`, 'utf8'));
const C = JSON.parse(await readFile(process.argv[2] || `${SITE}/source/coords-${ID}.json`, 'utf8'));

const at = (key) => {
  const p = C[key];
  if (!p) throw new Error('missing coordinate for ' + key);
  return [p.lat, p.lng];
};
const place = (name, key) => ({ name, coords: at(key) });

const photoFiles = new Set(await readdir(`${SITE}/${PHOTO}`).catch(() => []));

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
  1:  ['las-vegas', 'furnace-creek'],          2:  ['furnace-creek', 'furnace-creek'],
  3:  ['furnace-creek', 'furnace-creek'],      4:  ['furnace-creek', 'boulder-city'],
  5:  ['boulder-city', 'lake-havasu-city'],    6:  ['lake-havasu-city', 'lake-havasu-city'],
  7:  ['lake-havasu-city', 'scottsdale'],      8:  ['scottsdale', 'scottsdale'],
  9:  ['scottsdale', 'apache-junction'],       10: ['apache-junction', 'tucson'],
  11: ['tucson', 'tucson'],                    12: ['tucson', 'wickenburg'],
  13: ['wickenburg', 'las-vegas'],             14: ['las-vegas', 'las-vegas-airport']
};

/* Day 5 goes down US-93 through Kingman rather than cutting across. */
const VIA = { 5: ['kingman'] };

const POIS = {
  1: [poi('Zabriskie Point', 'zabriskie-point', 'zabriskie-point.jpg',
       'Golden badlands at sunset, ten minutes from Furnace Creek.')],
  2: [poi('Badwater Basin', 'badwater-basin', 'badwater-basin.jpg',
       'The lowest point in North America — 282 ft below sea level.'),
      poi('Golden Canyon', 'golden-canyon', 'golden-canyon.jpg',
       'An easy walk up a narrow canyon straight off the valley floor.'),
      poi("Artist's Drive", 'artists-drive', 'artists-drive.jpg',
       'A one-way loop through mineral-stained hills.')],
  3: [poi('Mesquite Flat Dunes', 'mesquite-flat-dunes', 'mesquite-flat-dunes.jpg',
       'Best at sunrise before the wind picks up.'),
      poi('Mosaic Canyon', 'mosaic-canyon', 'mosaic-canyon.jpg',
       'Polished marble narrows, a mile up from the car park.'),
      poi("Dante's View", 'dantes-view', 'dantes-view.jpg',
       '5,450 ft up, looking straight down at Badwater. The one cold place on this route.')],
  4: [poi('Hoover Dam', 'hoover-dam', 'hoover-dam.jpg',
       'Park and walk out onto the bridge — 20 minutes, no ticket needed.'),
      poi('Lake Mead', 'hemenway-harbor', 'lake-mead.jpg',
       'Hemenway Harbor, ten minutes from Boulder City and the bighorn sheep come down to the grass.')],
  5: [poi('Kingman', 'kingman', 'kingman-route66.jpg',
       'Where Route 66 crosses US-93. The Powerhouse museum and the old depot.'),
      poi('London Bridge', 'london-bridge', 'london-bridge.jpg',
       'The 1831 Thames bridge, bought in 1968 and rebuilt here block by numbered block.')],
  6: [poi('Lake Havasu State Park', 'lake-havasu-state-park', 'lake-havasu.jpg',
       'Around 18°C in January — warm enough for a boat, too cold to swim.')],
  7: [poi('Saguaro country', 'wickenburg', 'saguaro-landscape.jpg',
       'Somewhere around Wickenburg the first giant saguaros appear. They grow nowhere else on earth.')],
  8: [poi('Desert Botanical Garden', 'desert-botanical-garden', 'desert-botanical-garden.jpg',
       'The best introduction to this desert there is, and it is a garden, so it suits everyone.'),
      poi('Hole in the Rock, Papago Park', 'papago-hole-in-the-rock', 'hole-in-the-rock.jpg',
       'A ten-minute walk to a view over Phoenix. Free, and the easy alternative to Camelback.'),
      poi('Old Town Scottsdale', 'old-town-scottsdale', 'old-town-scottsdale.jpg',
       'Low adobe blocks, galleries and ice cream. An easy evening after a driving week.'),
      poi('Taliesin West', 'taliesin-west', 'taliesin-west.jpg',
       "Frank Lloyd Wright's winter camp, built into the desert in 1937.")],
  9: [poi('Lost Dutchman State Park', 'lost-dutchman-sp', 'lost-dutchman.jpg',
       'Directly beneath the Superstitions, with flat trails at the bottom of them.'),
      poi('Superstition Mountains', 'superstition-mountains', 'superstition-mountains.jpg',
       'The wall behind Apache Junction, and the best light on it is at the end of the day.'),
      poi('Canyon Lake', 'canyon-lake', 'canyon-lake.jpg',
       'A reservoir in a red-rock canyon, twenty minutes up the Apache Trail.'),
      poi('Tortilla Flat', 'tortilla-flat', 'tortilla-flat.jpg',
       'Population six. A saloon with dollar bills on the walls, and the end of the pavement.')],
  10: [poi('Saguaro National Park East', 'saguaro-east', 'saguaro-east.jpg',
        'Cactus Forest Loop Drive — eight paved miles through the densest saguaro in the park.')],
  11: [poi('Saguaro National Park West', 'saguaro-west', 'saguaro-west.jpg',
        'Denser and younger than the east side, and the better half for a walk.'),
       poi('Arizona-Sonora Desert Museum', 'sonora-desert-museum', 'sonora-desert-museum.jpg',
        'A zoo, a botanical garden and a natural history museum on one site. Allow most of a day.'),
       poi('Gates Pass', 'gates-pass', 'gates-pass.jpg',
        'The best sunset in Tucson — and closed to anything the size of a motorhome.'),
       poi('Mission San Xavier del Bac', 'mission-san-xavier', 'mission-san-xavier.jpg',
        'White as bone against the desert, and in continuous use since 1797.')],
  12: [poi('Vulture City', 'vulture-city', 'vulture-city.jpg',
        'The gold mine that founded Wickenburg, abandoned in 1942 and left standing.'),
       poi('Wickenburg', 'wickenburg', 'wickenburg.jpg',
        'An 1863 gold town that runs on horses now.')],
  13: [poi('Parker Dam', 'parker-dam', 'parker-dam.jpg',
        'The deepest dam in the world — two thirds of it is below the riverbed.')],
  14: []
};

const MUST_SEE = [
  ['Zabriskie Point', 1, 'zabriskie-point.jpg',
   'Golden badlands at sunset, ten minutes from where you sleep. The best view in Death Valley for the least effort.'],
  ['Badwater Basin', 2, 'badwater-basin.jpg',
   'The lowest point in North America, 282 ft below sea level, at 18°C in January. Walk out onto the salt flats.'],
  ['Mesquite Flat Dunes', 3, 'mesquite-flat-dunes.jpg',
   'Go at sunrise. Dunes the kids can run down, before the wind picks up and the light goes flat.'],
  ['Hoover Dam', 4, 'hoover-dam.jpg',
   'Park and walk out onto the bridge. Twenty minutes, no ticket, and it is still astonishing.'],
  ['London Bridge', 5, 'london-bridge.jpg',
   'The actual bridge from the Thames, shipped here in 1968 and rebuilt block by numbered block. Nothing about it makes sense and that is the point.'],
  ['Desert Botanical Garden', 8, 'desert-botanical-garden.jpg',
   'The one thing to pay for in Phoenix. Everything you have been driving past for a week, named and explained, on flat paths.'],
  ['The Superstition Mountains', 9, 'superstition-mountains.jpg',
   'A wall of rock straight out of the back of Apache Junction, best in the last hour of light.'],
  ['Cactus Forest Loop Drive', 10, 'saguaro-east.jpg',
   'Eight paved miles through the thickest saguaro stand in the park. Doable without leaving the vehicle on the day the legs give out.'],
  ['Arizona-Sonora Desert Museum', 11, 'sonora-desert-museum.jpg',
   'Routinely called one of the best museums in the country, and it is mostly outdoors. If you do one paid thing on this trip, do this.'],
  ['Mission San Xavier del Bac', 11, 'mission-san-xavier.jpg',
   'White as bone against the desert and in continuous use since 1797. Ten miles south of Tucson and free to walk into.']
].map(([name, day, photo, why]) => ({ name, day, photo: `${PHOTO}/${photo}`, why }));

const pn = src.practical_notes;

const WATCH_OUTS = [
  { title: 'Book the Phoenix nights before anything else',
    text: pn.booking_order },
  { title: 'Day 13 is 288 miles and it is not optional',
    text: pn.long_day },
  { title: 'It is warm, not hot',
    text: pn.warm_weather },
  { title: 'The Apache Trail is only paved to Tortilla Flat',
    text: pn.apache_trail },
  { title: 'Death Valley is still closing roads',
    text: pn.death_valley_closures },
  { title: 'The park pass does not cover the good bits in the middle',
    text: pn.paid_attractions },
  { title: 'Long empty stretches — fill up early',
    text: pn.fuel },
  { title: 'Price the unlimited-miles package',
    text: pn.mileage_fees }
];

const ROUTE_PROS = [
  'The warmest of the three loops. Phoenix and Tucson both average around 20°C in January, and no night is expected to freeze.',
  'Saguaro cactus country. The giant saguaro grows only in the Sonoran Desert and appears on neither of the other routes.',
  'Two national parks, two state parks, and the Arizona-Sonora Desert Museum, which is worth the drive on its own.',
  'Cities, for once. Phoenix and Tucson mean real supermarkets, real restaurants and a hospital — which matters with six people for two weeks.',
  'Day 9 is 28 miles. Half the trip is genuinely easy driving on main highways.',
  'One set of flights, one vehicle, one loop. Nothing is one-way.'
];

const ROUTE_CONS = [
  'Day 13 is 288 miles and the better part of six hours. There is no way to avoid it — Tucson is simply a long way from Las Vegas.',
  'Day 7 is another 210 miles. Two of the fourteen days carry most of the driving on the whole trip.',
  '1,545 miles in total, 180 more than the Low Desert Loop, and much of that is main highway rather than scenery.',
  'January is peak snowbird season across Phoenix and Tucson. RV parks book out months ahead and rooms are at their annual high.',
  'The middle of the trip is a metropolitan area of five million people. If the point of the holiday is empty desert, this is the wrong loop.',
  'Death Valley still has flood damage: Scotty’s Castle and Bonnie Clare Road are closed indefinitely, and several roads have soft shoulders and unpaved sections.'
];

const FLAGS = {
  motorhome: {
    2: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "Artist's Drive is closed to vehicles over 25 ft. Take the separate rental car — it is in the budget for exactly this." }],
    3: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "The final climb to Dante's View has the same 25 ft limit. Rental car again." }],
    7: [{ type: 'note', label: 'Book this stop first.',
          text: 'January to March is snowbird season across the Valley of the Sun. The full-hookup parks around Phoenix, Mesa and Apache Junction are booked months ahead and priced at their annual peak. Nothing else on this trip is anywhere near as hard to get.' }],
    9: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: 'The Apache Trail past Canyon Lake. Even the paved section is narrow with tight curves and is no place for a 30-footer, and beyond Tortilla Flat it is dirt and partly closed. Do Lost Dutchman and the Canyon Lake vista and turn around.' }],
    11: [{ type: 'blocked', label: 'Not in the motorhome:',
           text: 'Gates Pass is posted closed to RVs — a narrow switchback climb with no shoulders. Saguaro West and the Desert Museum are still open to you the long way round on Ajo Way, which adds about twenty minutes. You lose the sunset, not the park.' }]
  },
  'car-and-lodging': {
    2: [{ type: 'unlocked', label: 'Open to you:',
          text: "Artist's Drive, with no second rental car needed." }],
    3: [{ type: 'unlocked', label: 'Open to you:',
          text: "The climb to Dante's View, 5,450 ft up over Badwater." }],
    9: [{ type: 'unlocked', label: 'Open to you:',
          text: 'The Apache Trail through to Tortilla Flat — Canyon Lake, the saloon, and the end of the pavement. Do not carry on onto the dirt beyond it.' }],
    11: [{ type: 'unlocked', label: 'Open to you:',
           text: 'Gates Pass at sunset, which is the best hour in Tucson and one of the two places on this route the motorhome cannot follow.' }]
  }
};

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
  if (VIA[d.day]) day.via = VIA[d.day].map(at);
  if (d.drive_time) {
    day.driveTime = d.drive_time.replace(/^(\d+)h(\d+)$/, (_, h, m) => m === '00' ? `${h}h` : `${h}h ${m}m`);
  }
  return day;
});

const o1 = src.options.find((o) => o.id === 'option-1');
const o2 = src.options.find((o) => o.id === 'option-2');

const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);

const motorhome = {
  id: 'motorhome',
  name: o1.name,
  tagline: o1.tagline,
  summary: 'Transport and lodging in one vehicle, so you cook instead of eating out and there is nothing to book at six separate stops — except that on this route the one stop you do have to book, months ahead, is the Phoenix one, and it is the hardest booking on any of these trips.',
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
    notes: 'Everything for six people for fourteen days, flights included. The America the Beautiful pass covers Death Valley and both halves of Saguaro — but not the gardens, the museum or the state parks, which is why that line is bigger here than on the other routes.'
  },
  pros: o1.pros,
  cons: o1.cons,
  flags: FLAGS.motorhome
};

const flights = o1.budget.lines.find((l) => l.item === 'Flights');
const extras = o1.budget.lines.find((l) => l.item.startsWith('Gardens'));
const d = o2.budget_deltas;
const valueBuild = o2.builds.find((b) => b.id === 'value');
const locBuild = o2.builds.find((b) => b.id === 'location');

const carLines = [
  { item: 'Flights', value: flights.low, location: flights.high, basis: flights.basis },
  { item: 'Vehicle rental', value: o2.vehicle.cost_low, location: o2.vehicle.cost_high, basis: o2.vehicle.notes },
  { item: 'Fuel', value: d.fuel.low, location: d.fuel.high, basis: d.fuel.basis },
  { item: 'Lodging', value: d.lodging.value, location: d.lodging.location, basis: d.lodging.basis },
  { item: 'Food', value: d.food.low, location: d.food.high, basis: d.food.basis },
  { item: 'Gardens, museums and state parks', value: extras.low, location: extras.high, basis: extras.basis },
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
  summary: 'A seven-seater and a room every night. It costs meaningfully more, and almost all of the gap is food and lodging — but this is the route with a 288-mile day and a 210-mile day in it, and that is worth more here than on either of the others.',
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
    notes: '"Best value" sleeps in Mesa or Apache Junction rather than Scottsdale, which alone saves close to $700 over three nights — the single biggest lever in this budget. "Best location" puts you in Scottsdale proper, on the lake at Havasu, and in central Tucson.'
  },
  pros: o2.pros,
  cons: o2.cons,
  flags: FLAGS['car-and-lodging']
};

const route = {
  id: ID,
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/saguaro-west.jpg`,
  season: src.trip.season,
  startEnd: src.trip.start_end,
  totals: {
    days: src.trip.duration_days,
    miles: src.trip.total_miles,
    party: src.trip.party_size,
    avgMilesPerDay: src.trip.avg_miles_per_day
  },
  mustSee: MUST_SEE,
  watchOuts: WATCH_OUTS,
  pros: ROUTE_PROS,
  cons: ROUTE_CONS,
  notConsidered: src.rejected_alternatives.map((r) => ({ place: r.place, reason: r.reason })),
  moneySavers: src.money_savers.map((m) => ({ item: m.item, amount: m.saving || '', detail: m.detail })),
  options: [motorhome, car],
  days
};

await mkdir(`${SITE}/data/routes`, { recursive: true });
await writeFile(`${SITE}/data/routes/${ID}.json`, JSON.stringify(route, null, 2) + '\n');

const manifestPath = `${SITE}/data/manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"routes":[]}'));
if (!manifest.routes.includes(`routes/${ID}.json`)) manifest.routes.push(`routes/${ID}.json`);
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
const missing = route.days.flatMap((dy) => (dy.pois || []).filter((p) => !p.photos).map((p) => p.name));
console.log('route     :', route.name);
console.log('days      :', route.days.length, '| must-see:', route.mustSee.length,
  '| watch-outs:', route.watchOuts.length, '| pros/cons:', route.pros.length + '/' + route.cons.length);
console.log('options   :', route.options.map((o) => `${o.name} (${Object.keys(o.flags).length} day flags)`).join(', '));
console.log('costs     :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
console.log('no photo  :', missing.length ? missing.length + ' pois still without photos' : 'none');
