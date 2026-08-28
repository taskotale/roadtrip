#!/usr/bin/env node
/* Rebuilds data/routes/low-desert-loop.json from source/low-desert-trip-data.json.
   Run from the repo root:
       node tools/build-low-desert-loop.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/low-desert-loop.json

   Same shape as tools/build-southwest-loop.mjs — the itinerary text, the day
   flags and the stop list are written out below, and the coordinates come from
   source/coords-low-desert-loop.json. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ID = 'low-desert-loop';
const PHOTO = `assets/photos/${ID}`;

const src = JSON.parse(await readFile(`${SITE}/source/low-desert-trip-data.json`, 'utf8'));
const C = JSON.parse(await readFile(process.argv[2] || `${SITE}/source/coords-${ID}.json`, 'utf8'));

const at = (key) => {
  const p = C[key];
  if (!p) throw new Error('missing coordinate for ' + key);
  return [p.lat, p.lng];
};
const place = (name, key) => ({ name, coords: at(key) });

/* Every file in the photo folder, so a point of interest picks up its numbered
   variants (foo.jpg, foo-2.jpg, foo-3.jpg …) without being listed twice. */
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
  1:  ['las-vegas', 'furnace-creek'],        2:  ['furnace-creek', 'furnace-creek'],
  3:  ['furnace-creek', 'furnace-creek'],    4:  ['furnace-creek', 'barstow'],
  5:  ['barstow', 'palm-springs'],           6:  ['palm-springs', 'palm-springs'],
  7:  ['palm-springs', 'borrego-springs'],   8:  ['borrego-springs', 'borrego-springs'],
  9:  ['borrego-springs', 'twentynine-palms'], 10: ['twentynine-palms', 'twentynine-palms'],
  11: ['twentynine-palms', 'lake-havasu-city'], 12: ['lake-havasu-city', 'lake-havasu-city'],
  13: ['lake-havasu-city', 'las-vegas'],     14: ['las-vegas', 'las-vegas-airport']
};

/* Days that have to be pushed down a particular road. Points of interest do not
   steer the route — these do. */
const VIA = {
  5:  ['elmers-bottle-tree-ranch'],      // the old Route 66 alignment, not I-15
  11: ['amboy-crater', 'needles'],       // Amboy Road and Route 66, not I-10 via Parker
  13: ['kingman']                        // I-40 and US-93, the motorhome way
};

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
  4: [poi('Calico Ghost Town', 'calico-ghost-town', 'calico-ghost-town.jpg',
       'A silver town that went bust in 1896, rebuilt as a park.')],
  5: [poi("Elmer's Bottle Tree Ranch", 'elmers-bottle-tree-ranch', 'elmers-bottle-tree-ranch.jpg',
       'A forest of steel trees hung with thousands of glass bottles. Free, on the old road.')],
  6: [poi('Palm Springs Aerial Tramway', 'tramway-mountain-station', 'palm-springs-tramway.jpg',
       '2,600 ft to 8,500 ft in ten minutes. Shirtsleeves at the bottom, snow at the top.'),
      poi('Indian Canyons', 'indian-canyons', 'indian-canyons.jpg',
       'A real palm oasis on Agua Caliente land, and a walk that suits everyone.')],
  7: [poi('Salton Sea', 'salton-sea-north-shore', 'salton-sea.jpg',
       '230 ft below sea level, and only here because a canal broke in 1905.'),
      poi('Galleta Meadows', 'galleta-meadows', 'galleta-meadows.jpg',
       '130 life-size metal sculptures scattered across open land. No gate, no ticket.')],
  8: [poi('Borrego Palm Canyon', 'borrego-palm-canyon', 'borrego-palm-canyon.jpg',
       'Three miles round trip to a palm grove and, in a wet year, a waterfall.'),
      poi('The Slot', 'the-slot', 'the-slot.jpg',
       'A real slot canyon you walk yourself. No permit, no guide, no fee.'),
      poi("Font's Point", 'fonts-point', 'fonts-point.jpg',
       'The best view in the park — at the end of four miles of soft sand. 4WD only.')],
  9: [poi('Cholla Cactus Garden', 'cholla-cactus-garden', 'cholla-cactus-garden.jpg',
       'Ten acres of teddy-bear cholla on a quarter-mile loop. Do not touch them.'),
      poi('Keys View', 'keys-view', 'keys-view.jpg',
       '5,185 ft, looking down on the Coachella Valley and the San Andreas Fault.')],
  10: [poi('Hidden Valley', 'hidden-valley', 'hidden-valley.jpg',
        'A one-mile loop into a rock-walled bowl that cattle rustlers used to hide stock.'),
       poi('Barker Dam', 'barker-dam', 'barker-dam.jpg',
        'A 1900s ranchers’ reservoir, petroglyphs, and a 1.3-mile flat loop.'),
       poi('Skull Rock', 'skull-rock', 'skull-rock.jpg',
        'Right beside the road, and the one the kids will want photographed.'),
       poi('Arch Rock', 'arch-rock', 'arch-rock.jpg',
        'A short walk from White Tank to a 30-foot granite arch.')],
  11: [poi('Amboy Crater', 'amboy-crater', 'amboy-crater.jpg',
        'A 250-foot cinder cone you can walk into, off the emptiest part of Route 66.'),
       poi("Roy's Motel and Cafe", 'roys-motel-amboy', 'roys-motel.jpg',
        'One neon sign in an empty town. The photograph everybody takes.')],
  12: [poi('London Bridge', 'london-bridge', 'london-bridge.jpg',
        'The 1831 Thames bridge, bought in 1968 and rebuilt here block by numbered block.'),
       poi('Lake Havasu State Park', 'lake-havasu-state-park', 'lake-havasu.jpg',
        'Mid-60s in January — warm enough to be out on a boat, too cold to swim.')],
  13: [poi('Oatman', 'oatman', 'oatman.jpg',
        'Wild burros in the street, on the Route 66 pass the motorhome cannot take.'),
       poi('Kingman', 'kingman', 'kingman-route66.jpg',
        'Where Route 66 crosses US-93. The Powerhouse museum and the old depot.'),
       poi('Hoover Dam', 'hoover-dam', 'hoover-dam.jpg',
        'Park and walk out onto the bridge — 20 minutes, no ticket needed.')],
  14: []
};

/* The pick of the trip, shown as a gallery near the top of the route page. */
const MUST_SEE = [
  ['Zabriskie Point', 1, 'zabriskie-point.jpg',
   'Golden badlands at sunset, ten minutes from where you sleep. The best view in Death Valley for the least effort.'],
  ['Badwater Basin', 2, 'badwater-basin.jpg',
   'The lowest point in North America, 282 ft below sea level, at 65°F in January. Walk out onto the salt flats.'],
  ['Mesquite Flat Dunes', 3, 'mesquite-flat-dunes.jpg',
   'Go at sunrise. Dunes the kids can run down, before the wind picks up and the light goes flat.'],
  ["Elmer's Bottle Tree Ranch", 5, 'elmers-bottle-tree-ranch.jpg',
   'Free, on the old Route 66 alignment, and unlike anything else on any of these routes. Ten minutes, and worth the detour.'],
  ['Palm Springs Aerial Tramway', 6, 'palm-springs-tramway.jpg',
   'Ten minutes from the valley floor to 8,500 feet. The only snow anyone will see on this trip, and you choose whether to go up to it.'],
  ['Galleta Meadows', 7, 'galleta-meadows.jpg',
   'A 350-foot steel serpent crossing a road in the desert, and 129 other sculptures. Free, and the best surprise on the route.'],
  ['The Slot', 8, 'the-slot.jpg',
   'A slot canyon you walk yourself, with no permit and no guide. The Southwest Loop pays about $580 for six to do this at Antelope.'],
  ['Cholla Cactus Garden', 9, 'cholla-cactus-garden.jpg',
   'Ten acres of teddy-bear cholla lit from behind at the end of the day. A quarter-mile loop, and the best photograph in Joshua Tree.'],
  ['Skull Rock', 10, 'skull-rock.jpg',
   'Right beside the road, and the one every child on this trip will want a photograph of.'],
  ["Roy's Motel, Route 66", 11, 'roys-motel.jpg',
   'One neon sign in an abandoned town in the middle of the Mojave. This is the one the kids will talk about.']
].map(([name, day, photo, why]) => ({ name, day, photo: `${PHOTO}/${photo}`, why }));

const pn = src.practical_notes;

const WATCH_OUTS = [
  { title: 'Book Palm Springs first, then Borrego, then Havasu',
    text: pn.booking_order },
  { title: 'It is warm, not hot',
    text: pn.warm_weather },
  { title: "Font's Point is a four-wheel-drive road",
    text: pn.fonts_point },
  { title: 'Death Valley is still closing roads',
    text: pn.death_valley_closures },
  { title: 'California fuel costs more — fill up before you cross',
    text: pn.fuel },
  { title: 'The park pass does not cover the state parks',
    text: pn.state_parks },
  { title: 'The Oatman Highway is not for everybody',
    text: pn.oatman_highway },
  { title: 'Price the unlimited-miles package',
    text: pn.mileage_fees }
];

const ROUTE_PROS = [
  'No night is expected to freeze. Nothing on this route sleeps above 2,200 feet, and the coldest stop averages a low in the high 30s.',
  'Two national parks, three state parks and 200 miles of original Route 66, out and back from a single airport.',
  'Short days: 98 miles a day on average, and six of the fourteen days involve no driving between towns at all.',
  'January is the best month of the year to be in the low desert. Palm Springs runs to the low 70s and Death Valley to the mid-60s.',
  'The motorhome stops being a compromise. Its worst problem on the Southwest Loop was seven freezing nights, and this route does not have one.',
  'One set of flights, one vehicle, one loop. Nothing is one-way.'
];

const ROUTE_CONS = [
  'Two national parks instead of five. The warm places are the low places, and the famous parks are nearly all high.',
  'January is high season in the Coachella Valley, so Palm Springs is the one expensive stop — the reverse of the Southwest Loop, where the cold made everything cheap.',
  'Day 4 and day 11 are both around 177 miles of mostly empty desert. That is the price of a loop this wide.',
  "Font's Point needs four-wheel drive — four miles of soft sand. Neither build reaches it.",
  'Death Valley still has flood damage: Scotty’s Castle and Bonnie Clare Road are closed indefinitely, and several roads have soft shoulders and unpaved sections.',
  'No red rock. This is a route of salt flats, palms, cholla and lava — if what you wanted was Zion and Monument Valley, take the Southwest Loop and dress for it.'
];

const FLAGS = {
  motorhome: {
    2: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "Artist's Drive is closed to vehicles over 25 ft. Take the separate rental car — it is in the budget for exactly this." }],
    3: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "The final climb to Dante's View has the same 25 ft limit. Rental car again. These two are the only places on the whole route the motorhome cannot go." }],
    8: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: "Font's Point — four miles of soft sand off the Borrego Salton Seaway. Nothing without four-wheel drive gets there, so this one is out for the car build too." }],
    9: [{ type: 'note', label: 'You sleep in town, not in the park.',
          text: "Joshua Tree's own campgrounds cap at around 25 to 35 ft and have no hookups, no dump station and mostly no water. A full-hookup site in Twentynine Palms costs about the same and you are ten minutes from the north entrance. The park roads themselves are fine in a 30-footer." }],
    13: [{ type: 'blocked', label: 'Not in the motorhome:',
           text: 'The Oatman Highway over Sitgreaves Pass — steep, blind hairpins, no room for a 30-footer. The map shows the I-40 route through Kingman, which is the one in the plan and 23 miles shorter anyway.' }]
  },
  'car-and-lodging': {
    2: [{ type: 'unlocked', label: 'Open to you:',
          text: "Artist's Drive, with no second rental car needed." }],
    3: [{ type: 'unlocked', label: 'Open to you:',
          text: "The climb to Dante's View, 5,450 ft up over Badwater." }],
    8: [{ type: 'note', label: 'Still not open to you:',
          text: "Font's Point needs four-wheel drive — four miles of soft sand, and it strands two-wheel-drive vehicles regularly. A minivan will not make it. This is the one place on the route neither build reaches without renting something else for the day." }],
    13: [{ type: 'unlocked', label: 'Open to you:',
           text: 'The Oatman Highway. 23 miles longer, an hour slower, and the wild burros come to the car window. Check the rental agreement first — many of them effectively prohibit Sitgreaves Pass. The map shows the detour.' }]
  }
};

/* The car can take the Route 66 pass through Oatman; the motorhome cannot. */
const CAR_DAY13_DETOUR = [at('oatman'), at('kingman')];

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

/* Derive the totals from the lines so the table on screen always adds up. The
   site shows totals only — the kids are not paying, and one person dropping out
   would not move the number much, so a per-head figure would mislead. */
const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);

const motorhome = {
  id: 'motorhome',
  name: o1.name,
  tagline: o1.tagline,
  summary: 'Transport and lodging in one vehicle, so there is nothing to book at six separate stops and you cook instead of eating out. On the Southwest Loop the catch was seven freezing nights; here there are none, and only two stops on the whole route it cannot reach.',
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
    notes: 'Everything for six people for fourteen days, flights included. The America the Beautiful pass is already owned, so national park entry is zero — but Anza-Borrego, the Salton Sea and Lake Havasu are state parks and charge separately.'
  },
  pros: o1.pros,
  cons: o1.cons,
  flags: FLAGS.motorhome
};

/* Option 2 is quoted as two builds rather than a range. "Everything else" is the
   remainder up to each quoted total, so both columns add up to their heading. */
const flights = o1.budget.lines.find((l) => l.item === 'Flights');
const tram = o1.budget.lines.find((l) => l.item.includes('Tramway'));
const parks = o1.budget.lines.find((l) => l.item.includes('State park'));
const d = o2.budget_deltas;
const valueBuild = o2.builds.find((b) => b.id === 'value');
const locBuild = o2.builds.find((b) => b.id === 'location');

const carLines = [
  { item: 'Flights', value: flights.low, location: flights.high, basis: flights.basis },
  { item: 'Vehicle rental', value: o2.vehicle.cost_low, location: o2.vehicle.cost_high, basis: o2.vehicle.notes },
  { item: 'Fuel', value: d.fuel.low, location: d.fuel.high, basis: d.fuel.basis },
  { item: 'Lodging', value: d.lodging.value, location: d.lodging.location, basis: d.lodging.basis },
  { item: 'Food', value: d.food.low, location: d.food.high, basis: d.food.basis },
  { item: 'Palm Springs Aerial Tramway', value: tram.low, location: tram.high, basis: tram.basis },
  { item: 'State park day use', value: parks.low, location: parks.high, basis: parks.basis },
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
  summary: 'A seven-seater and a room every night. It costs meaningfully more, and almost all of the gap is food and lodging — but on this route it buys comfort rather than warmth, because the motorhome is not cold here either.',
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
    notes: '"Best value" goes midweek in Palm Springs, sleeps in Barstow rather than a resort, and takes motels over rental houses. "Best location" puts you in the Coachella Valley proper, on the lake at Havasu, and inside Borrego Springs rather than out at the edge.'
  },
  pros: o2.pros,
  cons: o2.cons,
  flags: FLAGS['car-and-lodging'],
  dayVia: { 13: CAR_DAY13_DETOUR }
};

const route = {
  id: ID,
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/galleta-meadows.jpg`,
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

/* Add this route to the manifest without disturbing the ones already there. */
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
console.log('no photo  :', missing.length ? missing.join(', ') : 'none');
