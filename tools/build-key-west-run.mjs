#!/usr/bin/env node
/* Rebuilds data/routes/key-west-run.json from source/key-west-trip-data.json.
   Run from the repo root:
       node tools/build-key-west-run.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/key-west-run.json

   Same shape as tools/build-sonoran-loop.mjs. The one structural difference:
   this route's options split on the vehicle (rented car versus motorhome)
   rather than on where you sleep, because it is driven from home. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ID = 'key-west-run';
const PHOTO = `assets/photos/${ID}`;

const src = JSON.parse(await readFile(`${SITE}/source/key-west-trip-data.json`, 'utf8'));
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

const NAMES = {
  'fort-lee': 'Fort Lee, NJ', richmond: 'Richmond, VA', savannah: 'Savannah, GA',
  kissimmee: 'Kissimmee, FL', homestead: 'Homestead, FL', marathon: 'Marathon, FL',
  naples: 'Naples, FL', 'st-augustine': 'St Augustine, FL', charleston: 'Charleston, SC'
};

const STOPS = {
  1:  ['fort-lee', 'richmond'],        2:  ['richmond', 'savannah'],
  3:  ['savannah', 'kissimmee'],       4:  ['kissimmee', 'kissimmee'],
  5:  ['kissimmee', 'kissimmee'],      6:  ['kissimmee', 'homestead'],
  7:  ['homestead', 'homestead'],      8:  ['homestead', 'marathon'],
  9:  ['marathon', 'marathon'],        10: ['marathon', 'naples'],
  11: ['naples', 'st-augustine'],      12: ['st-augustine', 'charleston'],
  13: ['charleston', 'richmond'],      14: ['richmond', 'fort-lee']
};

const POIS = {
  2: [poi('River Street', 'river-street', 'river-street.jpg',
       'Cobbled, right on the water, and lit up long after the drive is over.')],
  3: [poi('Forsyth Park', 'forsyth-park', 'forsyth-park.jpg',
       'The fountain at the south end of the squares, under live oaks and Spanish moss.')],
  4: [poi('LEGOLAND Florida', 'legoland', 'legoland.jpg',
       'Built on the old Cypress Gardens site — the botanical gardens are still behind the rides.')],
  5: [poi('Kennedy Space Center', 'kennedy-space-center', 'kennedy-space-center.jpg',
       'Space Shuttle Atlantis hangs a few feet from the glass with its payload doors open.'),
      poi('Vehicle Assembly Building', 'vehicle-assembly', 'vehicle-assembly-building.jpg',
       'One of the largest buildings in the world by volume. The bus tour runs past it.')],
  7: [poi('Anhinga Trail', 'royal-palm', 'anhinga-trail.jpg',
       'Half a mile of boardwalk at Royal Palm, with alligators on the bank beneath it.'),
      poi('Shark Valley', 'shark-valley', 'shark-valley.jpg',
       'A fifteen-mile loop out to an observation tower, by tram or on a rented bike.'),
      poi('Flamingo', 'flamingo', 'flamingo.jpg',
       'The far end of the park road, where Florida Bay starts. Manatees in the marina in winter.')],
  8: [poi('Seven Mile Bridge', 'seven-mile-bridge', 'seven-mile-bridge.jpg',
       'The 1982 span, with the abandoned 1912 railway bridge running alongside it.'),
      poi('Bahia Honda State Park', 'bahia-honda', 'bahia-honda.jpg',
       'The best beach in the Keys, and $8 for the whole vehicle.')],
  9: [poi('Key West Old Town', 'key-west', 'key-west-old-town.jpg',
       'Twelve walkable blocks of conch houses, tin roofs and deep verandas.'),
      poi('Mallory Square', 'mallory-square', 'mallory-square.jpg',
       'The sunset gathering happens every evening and costs nothing.'),
      poi('Southernmost Point', 'southernmost-point', 'southernmost-point.jpg',
       '90 miles to Cuba, says the buoy. Expect a queue for the photograph.'),
      poi('Hemingway House', 'hemingway-house', 'hemingway-house.jpg',
       'He wrote here for a decade. The descendants of his six-toed cats still run the garden.')],
  10: [poi('Naples Pier', 'naples-pier', 'naples-pier.jpg',
        'Thousand feet of boardwalk into a flat Gulf, and the warmest evening of the trip.')],
  11: [poi('St Augustine Old Town', 'st-george-street', 'st-george-street.jpg',
        'Deep verandas and palms in a town founded in 1565 — genuinely old, not reconstructed.')],
  12: [poi('Castillo de San Marcos', 'castillo', 'castillo-de-san-marcos.jpg',
        'Begun in 1672, built of coquina shell rock, and never taken by force.'),
       poi('Rainbow Row', 'rainbow-row', 'rainbow-row.jpg',
        'Thirteen painted Georgian houses on East Bay Street.'),
       poi('The Battery', 'the-battery', 'the-battery.jpg',
        'The seawall promenade at the tip of the peninsula, looking out at Fort Sumter.')],
  13: [poi('Fort Sumter', 'fort-sumter', 'fort-sumter.jpg',
        'Out in the harbour, ferry only. Worth it if you can afford the late start.')]
};

const MUST_SEE = [
  ['Forsyth Park', 3, 'forsyth-park.jpg', 'Twenty-two squares, and this is the one at the end of them.'],
  ['Kennedy Space Center', 5, 'kennedy-space-center.jpg', 'A flown shuttle and a complete Saturn V in one day.'],
  ['Anhinga Trail', 7, 'anhinga-trail.jpg', 'Alligators a few feet away, in the one month with no mosquitoes.'],
  ['Seven Mile Bridge', 8, 'seven-mile-bridge.jpg', 'The drive that makes the whole detour south worth it.'],
  ['Bahia Honda', 8, 'bahia-honda.jpg', 'The best beach in the Keys, for $8 a vehicle.'],
  ['Mallory Square at sunset', 9, 'mallory-square.jpg', 'Every evening, free, and the reason to stay till dark.'],
  ['Southernmost Point', 9, 'southernmost-point.jpg', 'The end of the road, 90 miles from Cuba.'],
  ['Naples Pier', 10, 'naples-pier.jpg', 'The Gulf side, flat and warm, after nine days of Atlantic.'],
  ['Castillo de San Marcos', 12, 'castillo-de-san-marcos.jpg', 'A Spanish fort from 1672, covered by the park pass.'],
  ['Rainbow Row', 12, 'rainbow-row.jpg', 'Charleston on foot, which is the only way to do it.']
].map(([name, day, file, why]) => ({ name, day, photo: `${PHOTO}/${file}`, why }));

const WATCH_OUTS = [
  { title: 'Book Marathon and Kissimmee first',
    text: 'They are the two multi-night bases and the two that decide the budget. January is peak season in the Keys and the cheap Marathon rooms are the first to go. Everything else on this route can be booked late.' },
  { title: 'The Overseas Highway is the only road',
    text: 'US-1 runs 113 miles from Key Largo to Key West over 42 bridges, mostly one lane in each direction, with no alternative route at any point. An accident closes it. In January, in peak season, allow four hours from Homestead to Key West rather than the three the map promises.' },
  { title: 'Two days over 400 miles, and neither is optional',
    text: 'Day 2 is 467 miles and day 13 is 423, both on I-95. They are the price of reaching Key West from New Jersey in a fortnight. Day 2 is deliberately early, while everyone is still fresh.' },
  { title: 'Florida in January is peak season',
    text: 'The exact reverse of the desert. South Florida is at its most expensive precisely when the weather is best — Keys rooms above $275, Miami $250 to $450, Naples in full snowbird season. Central Florida is the cheap part, which is why three nights sit in Kissimmee.' },
  { title: 'Check the park pass is still in date',
    text: 'An America the Beautiful pass covers Everglades entry, Castillo de San Marcos and the Fort Sumter grounds — but it is an annual pass, so last year’s is no use. It does not cover the Fort Sumter ferry, Bahia Honda, or any Florida state park.' },
  { title: 'E-ZPass now works in Florida',
    text: 'It is accepted on all Florida toll roads, so there is no need for a separate SunPass. Do not carry two transponders in the vehicle at once — on the Central Florida expressways you can be billed on both accounts for the same trip.' },
  { title: 'Six people and fourteen days of luggage',
    text: 'A seven-seat minivan seats everyone but the space behind the third row is small. Either accept a roof box or take a full-size SUV, which costs more to hire and roughly $190 more in fuel over this distance. Price both before you book.' },
  { title: 'Confirm unlimited mileage before you book',
    text: 'This route covers about 3,350 miles. Anything charged per mile turns into a second rental fee — at $0.35 a mile that is close to $1,200. Major-brand car hire is normally unlimited; peer-to-peer motorhome listings usually are not.' },
  { title: 'New Jersey motorhomes are winterized until late March',
    text: 'Rigs in cold states are drained from about mid-October. You would pay to have it de-winterized to have running water, then start and finish the trip in freezing New Jersey with live plumbing. Burst pipes are charged to the renter.',
    only: 'motorhome' },
  { title: 'The cheap Keys camping has already gone',
    text: 'Bahia Honda is $36 to $43 a night plus $7 for electric, and it books on an eleven-month window with Florida residents given first refusal and everyone else waiting another thirty days. For a January trip that window closes early the previous year. What is left is private Keys parks at $100 to $200 a night.',
    only: 'motorhome' },
  { title: 'Key West turns away oversize vehicles',
    text: 'Most car parks in the old town will not take a 30-footer. Plan to leave it in Marathon, or check in advance which garages take oversize and what they charge.',
    only: 'motorhome' }
];

const ROUTE_PROS = [
  'Key West and the Overseas Highway — 113 miles over 42 bridges, and not something you can do on a weekend from New Jersey.',
  'The Everglades in dry season. January is the best month of the year to be there: the water is low so the wildlife concentrates, and the mosquitoes are gone.',
  'No flights, no airport, no transfers for six people. The car is loaded at the front door.',
  'Four walkable historic cities on the same line — Savannah, St Augustine, Charleston and Key West.',
  'The theme park day costs about a third of Disney and is better pitched at children under twelve.',
  'Warm from day 3 to day 11, and warmest at the far end where the schedule slows down.'
];

const ROUTE_CONS = [
  '3,350 miles, nearly 3,000 of it between towns. The Southwest Loop covers 1,655.',
  'Two days over 400 miles, both on I-95, both unavoidable.',
  'No mountains. January closes the Blue Ridge Parkway, Skyline Drive and Kuwohi Road, so the season takes away one of the four things this trip was meant to include.',
  'Florida in January is peak season and the lodging prices show it — the exact reverse of the desert in winter.',
  'The run home from Charleston is three days of interstate with very little on it.',
  'One night each in Savannah and Charleston, which is not enough for either.'
];

/* ---------- options ---------- */

const carLines = [
  ['Vehicle rental, 14 days', 1150, 1850, 'Seven-seat minivan against a full-size SUV, hired from a neighbourhood branch rather than Newark Airport. January is the cheapest month of the year for it.'],
  ['Fuel', 520, 710, '3,350 miles at about 24 mpg in the van and 18 in the SUV, around $3.80 a gallon'],
  ['Lodging, 13 nights', 2600, 3100, 'Two rooms or one rental house. Three nights Kissimmee, two Homestead, two Marathon, the rest single nights.'],
  ['Food', 1750, 2050, 'Six people, fourteen days, eating out with breakfasts in'],
  ['LEGOLAND Florida', 470, 520, 'Six, booked online for a low-demand January date'],
  ['Kennedy Space Center', 480, 540, 'Six, plus parking'],
  ['Everglades tram or airboat', 200, 260, 'Shark Valley tram for six, or an airboat at $26 to $40 a head'],
  ['Fort Sumter ferry', 210, 230, 'Only if day 13 starts late enough to allow it'],
  ['Tolls', 200, 240, 'The I-95 corridor and Florida’s Turnpike. E-ZPass is accepted throughout.'],
  ['Parking and small entries', 180, 260, 'Key West garage, Bahia Honda $8 a vehicle, Blue Spring $6, Castillo covered by the park pass'],
  ['Incidentals', 260, 340, 'Laundry, snacks, and the things that always come up']
];

const rvLines = [
  ['Motorhome rental, 14 nights', 2100, 3150, 'Class C hired in New Jersey. Peer-to-peer listings run $175 to $224 a night.'],
  ['Mileage over the daily allowance', 0, 650, 'Peer-to-peer rentals typically include 100 to 150 miles a day. This route averages 239.'],
  ['De-winterizing', 60, 60, 'New Jersey rigs are drained from mid-October to late March'],
  ['Fuel', 1510, 1660, '3,350 miles at 8 mpg. This single line is where the motorhome loses the argument.'],
  ['Campgrounds, 13 nights', 860, 1420, 'Private Keys parks run $100 to $200 a night in January, and the state park sites are long gone.'],
  ['Food and groceries', 1050, 1450, 'Cooking in the motorhome with a few meals out'],
  ['Bedding and kitchen kit', 220, 320, 'Bought at home rather than paying per-person kit fees'],
  ['LEGOLAND Florida', 470, 520, 'Six, booked online for a low-demand January date'],
  ['Kennedy Space Center', 480, 540, 'Six, plus oversize parking'],
  ['Everglades tram or airboat', 200, 260, 'Shark Valley tram for six, or an airboat at $26 to $40 a head'],
  ['Fort Sumter ferry', 210, 230, 'Only if day 13 starts late enough to allow it'],
  ['Tolls', 260, 300, 'Higher than the car — most East Coast tolls are charged by axle and by height.'],
  ['Parking and small entries', 220, 320, 'Key West garages that take an oversize vehicle are scarce and dear.'],
  ['Incidentals', 280, 420, 'Propane, laundry, dump fees and showers']
];

const mkLines = (rows, k1, k2) =>
  rows.map(([item, a, b, basis]) => ({ item, [k1]: a, [k2]: b, basis }));
const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);

const car = {
  id: 'car-and-lodging',
  name: 'Car and lodging',
  tagline: 'A hired van, thirteen nights booked',
  summary: 'The straightforward build, and the one this route is designed around. Hire a seven-seat van or a full-size SUV at home, book thirteen nights, and keep the vehicle small enough to park in four historic downtowns and drive into Key West. Costs more per night than camping and much less to fuel.',
  vehicle: {
    type: 'Seven-seat minivan or full-size SUV',
    detail: 'Chrysler Pacifica · Honda Odyssey · Toyota Sienna · Chevrolet Suburban',
    notes: 'The van is cheaper to hire and much cheaper to fuel; the SUV is the one that swallows fourteen days of luggage for six without a roof box. Hire from a neighbourhood branch rather than Newark Airport — you are not flying, so there is no reason to pay the concession fee.'
  },
  costs: {
    currency: 'USD',
    columns: [{ key: 'van', label: 'Minivan' }, { key: 'suv', label: 'Full-size SUV' }],
    totals: { van: 0, suv: 0 },
    lines: mkLines(carLines, 'van', 'suv'),
    notes: 'The gap between the columns is mostly vehicle and fuel — about $700 on the hire and $190 on fuel over 3,350 miles — with a little more headroom on lodging and food. If everyone travels light, the van is the better buy.'
  },
  pros: [
    'Parks anywhere. Four of the best stops on this route are old towns with narrow streets.',
    'Roughly $1,000 less in fuel than the motorhome over this distance.',
    'Drives into Key West and parks there, which the motorhome largely cannot.',
    'No de-winterizing, no plumbing to freeze on days 1, 2, 13 and 14.'
  ],
  cons: [
    'Thirteen check-ins for six people.',
    'Lodging is the single biggest line in the budget, and January is peak season for half of it.',
    'The two 400-mile days are spent belted into seats.'
  ]
};

const rv = {
  id: 'motorhome',
  name: 'Motorhome',
  tagline: 'Cheaper at the bottom, dearer at the top, awkward in the Keys',
  summary: 'A Class C hired in New Jersey. On paper it lands within a few hundred dollars of the car build — the campground and food savings very nearly cancel the hire and the fuel. What decides it is not the money: it is a winterized rig starting and finishing in a freezing New Jersey, no state park sites left in the Keys, and a 30-footer in Savannah, St Augustine, Charleston and Key West.',
  vehicle: {
    type: 'Class C motorhome, around 30 ft',
    detail: 'Sleeps 6 to 7 · 6 to 7 seatbelts · roughly 8 mpg',
    notes: 'Book by seatbelt count rather than sleeping capacity. Confirm the mileage allowance in writing: at 3,350 miles, a 100-mile daily cap adds well over $500. Ask specifically whether the unit is winterized and what de-winterizing costs.'
  },
  costs: {
    currency: 'USD',
    columns: [{ key: 'low', label: 'Low' }, { key: 'high', label: 'High' }],
    totals: { low: 0, high: 0 },
    lines: mkLines(rvLines, 'low', 'high'),
    notes: 'The low column assumes a flat-rate hire with unlimited mileage and state or county campgrounds wherever they can be got. The high column is a peer-to-peer hire with a daily mileage cap and private Keys parks at winter rates. The spread is wider than the car build because more of it is outside your control.'
  },
  pros: [
    'The two 400-mile days are far more bearable when three children can get up and move.',
    'No check-ins, and the food line drops by around $600.',
    'Campgrounds outside the Keys are genuinely cheap in January.'
  ],
  cons: [
    'About $1,000 more in fuel at 8 mpg over 3,350 miles.',
    'Winterized at both ends of the trip, with freeze damage charged to you.',
    'The cheap Keys campsites were booked out a year ahead; what remains is dearer than the Marathon rooms.',
    'Awkward or barred at four of the best stops on the route.'
  ]
};

const FLAGS = {
  'car-and-lodging': {
    3: [{ type: 'note', label: 'Worth knowing:', text: 'Kissimmee rental houses often come in under two hotel rooms and give you a kitchen for the three nights.' }],
    8: [{ type: 'note', label: 'On the bridges:', text: 'The van handles the Overseas Highway like any other road. Watch the crosswind on the Seven Mile Bridge.' }],
    9: [{ type: 'unlocked', label: 'Drive right in:', text: 'Park once in an old-town garage and walk. Key West is about twelve blocks end to end.' }]
  },
  motorhome: {
    1: [{ type: 'blocked', label: 'Winterized:', text: 'New Jersey rigs are drained from mid-October to late March. De-winterize it and you start and finish in freezing New Jersey with live plumbing.' }],
    2: [{ type: 'unlocked', label: 'This is the day it earns its keep:', text: '467 miles is a great deal more bearable when the children can get out of their seats.' }],
    7: [{ type: 'note', label: 'Book early:', text: 'Long Pine Key and Flamingo both take motorhomes, but January is the busiest month in the Everglades.' }],
    8: [{ type: 'blocked', label: 'Bahia Honda is gone:', text: 'The state park campground books on an eleven-month window with Florida residents first. For a January trip that closed early the previous year.' }],
    9: [{ type: 'blocked', label: 'Not into Key West:', text: 'Most old-town car parks turn away oversize vehicles. Leave it in Marathon and take something smaller down, or check which garages take a 30-footer.' }],
    10: [{ type: 'note', label: 'Take the Alley:', text: 'Alligator Alley is flat, straight and fine in a motorhome. The Tamiami Trail is narrower and much slower.' }],
    13: [{ type: 'unlocked', label: 'The other long one:', text: 'Same argument as day 2, over 423 miles.' }]
  }
};

[car, rv].forEach((opt) => {
  opt.costs.columns.forEach((col) => { opt.costs.totals[col.key] = sumLines(opt.costs.lines, col.key); });
  opt.flags = FLAGS[opt.id];
});

/* ---------- days ---------- */

const days = src.days.map((d) => {
  const [fromKey, toKey] = STOPS[d.day];
  const from = place(NAMES[fromKey], fromKey);
  const to = place(NAMES[toKey], toKey);
  return {
    day: d.day,
    from, to,
    miles: d.miles,
    driveTime: d.driveTime,
    headline: d.headline,
    notes: d.notes,
    ...(d.activities ? { activities: d.activities } : {}),
    ...(POIS[d.day] ? { pois: POIS[d.day] } : {}),
    route: [from.coords, to.coords]
  };
});

const route = {
  id: ID,
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/bahia-honda.jpg`,
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
  options: [car, rv],
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
console.log('options   :', route.options.map((o) => `${o.name} $${o.costs.totals[o.costs.columns[0].key]}-${o.costs.totals[o.costs.columns[1].key]} (${Object.keys(o.flags).length} day flags)`).join(', '));
console.log('miles     :', route.days.reduce((t, d) => t + d.miles, 0), 'intercity |', route.totals.miles, 'stated total');
console.log('costs     :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
console.log('no photo  :', missing.length ? missing.length + ' pois still without photos' : 'none');
