#!/usr/bin/env node
/* Rebuilds data/routes/new-orleans-loop.json from source/new-orleans-trip-data.json.
   Run from the repo root:
       node tools/build-new-orleans-loop.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/new-orleans-loop.json

   Same shape as tools/build-key-west-run.mjs — the other route driven from home.
   The difference is that this one is a loop rather than an out-and-back, so no
   day repeats another day's road, and the options split on the vehicle for the
   same reason the Key West Run's do: you are not flying anywhere. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ID = 'new-orleans-loop';
const PHOTO = `assets/photos/${ID}`;

const src = JSON.parse(await readFile(`${SITE}/source/new-orleans-trip-data.json`, 'utf8'));
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
  'fort-lee': 'Fort Lee, NJ', luray: 'Luray, VA', bristol: 'Bristol, VA/TN',
  nashville: 'Nashville, TN', memphis: 'Memphis, TN', vicksburg: 'Vicksburg, MS',
  'new-orleans': 'New Orleans, LA', mobile: 'Mobile, AL', atlanta: 'Atlanta, GA',
  charlotte: 'Charlotte, NC', fredericksburg: 'Fredericksburg, VA'
};

const STOPS = {
  1:  ['fort-lee', 'luray'],           2:  ['luray', 'bristol'],
  3:  ['bristol', 'nashville'],        4:  ['nashville', 'memphis'],
  5:  ['memphis', 'memphis'],          6:  ['memphis', 'vicksburg'],
  7:  ['vicksburg', 'new-orleans'],    8:  ['new-orleans', 'new-orleans'],
  9:  ['new-orleans', 'new-orleans'],  10: ['new-orleans', 'mobile'],
  11: ['mobile', 'atlanta'],           12: ['atlanta', 'charlotte'],
  13: ['charlotte', 'fredericksburg'], 14: ['fredericksburg', 'fort-lee']
};

/* Days that need steering off the fastest line. Day 6 goes down US-61 through
   Clarksdale rather than I-55; day 7 calls at Emerald Mound; day 10 takes the
   coast road rather than I-10; day 11 breaks at Montgomery. */
const VIA = {
  6:  [at('clarksdale')],
  7:  [at('emerald-mound'), at('natchez')],
  10: [at('biloxi-lighthouse'), at('ocean-springs')],
  11: [at('montgomery')]
};

const POIS = {
  1: [poi('Harpers Ferry', 'harpers-ferry', 'harpers-ferry.jpg',
       'The town sits in the notch where the Shenandoah runs into the Potomac, with Maryland and Virginia across the water.')],
  2: [poi('Luray Caverns', 'luray-caverns', 'luray-caverns.jpg',
       'A mile and a quarter of paved path, a constant 12°C, and columns the height of a house.'),
      poi('State Street, Bristol', 'bristol', 'bristol-state-street.jpg',
       'One town in two states. The line runs down the middle of the road, with a brass marker set into the tarmac.')],
  3: [poi('The Ryman Auditorium', 'ryman', 'ryman-auditorium.jpg',
       'A tabernacle built in 1892, the Opry’s home for thirty years, and its home again for a stretch of every winter.')],
  4: [poi('Country Music Hall of Fame', 'country-music-hof', 'country-music-hof.jpg',
       'It ends in the Rotunda: bronze plaques in a circle under “Will the Circle Be Unbroken” cut into the stone.'),
      poi('The Parthenon, Centennial Park', 'nashville-parthenon', 'nashville-parthenon.jpg',
       'A full-scale replica of the Athens original, with a 42-foot gilded Athena standing inside it.')],
  5: [poi('Graceland', 'graceland', 'graceland.jpg',
       'Nine miles south of downtown. In January it sometimes has snow on the wall the fans write on.'),
      poi('National Civil Rights Museum', 'civil-rights-museum', 'civil-rights-museum.jpg',
       'Built into and around the Lorraine Motel, with the balcony left exactly as it was on 4 April 1968.'),
      poi('Sun Studio', 'sun-studio', 'sun-studio.jpg',
       'One small room on Union Avenue where Elvis, Cash, Perkins and Lewis all recorded.'),
      poi('Beale Street', 'beale-street', 'beale-street.jpg',
       'Three blocks of neon and clubs. Best early in the evening if the children are coming.'),
      poi('The Peabody ducks', 'peabody', 'peabody-ducks.jpg',
       'Down to the lobby fountain at eleven, back up at five, every day, for nothing.')],
  6: [poi('Delta Blues Museum', 'delta-blues-museum', 'delta-blues-museum.jpg',
       'In the old freight depot at Clarksdale. Ten to five, Monday to Saturday, shut on Sundays.'),
      poi('Ground Zero Blues Club', 'clarksdale', 'ground-zero.jpg',
       'Lunch, and a room where the paint is held on by decades of signatures.')],
  7: [poi('Vicksburg National Military Park', 'vicksburg-nmp', 'vicksburg-nmp.jpg',
       'A 16-mile tour road past 1,325 monuments and markers, opening at 8:30.'),
      poi('USS Cairo', 'uss-cairo', 'uss-cairo.jpg',
       'An ironclad mined on the Yazoo in 1862, salvaged a century later, open to the sky under a canopy.'),
      poi('Emerald Mound', 'emerald-mound', 'emerald-mound.jpg',
       'Eight acres of platform mound, free and unstaffed, at Natchez Trace milepost 10.'),
      poi('The Natchez Trace Parkway', 'natchez-trace', 'natchez-trace.jpg',
       'Four hundred and forty-four miles of it. This route drives the last twenty.'),
      poi('Natchez', 'natchez', 'natchez.jpg',
       'A town of intact nineteenth-century houses on a bluff above the Mississippi.')],
  8: [poi('Jackson Square', 'jackson-square', 'jackson-square.jpg',
       'St Louis Cathedral behind, the Cabildo and the Presbytère either side, and the levee in front.'),
      poi('Café du Monde', 'cafe-du-monde', 'cafe-du-monde.jpg',
       'Beignets and chicory café au lait since 1862. Open from 7:15am to about eleven at night.'),
      poi('The National WWII Museum', 'wwii-museum', 'wwii-museum.jpg',
       'Four pavilions in the Warehouse District, and a genuine half day.')],
  9: [poi('The St Charles streetcar', 'st-charles-line', 'st-charles-streetcar.jpg',
       'The oldest continuously operating streetcar line in the world, in 1923 cars, for $1.25.'),
      poi('The Garden District', 'garden-district', 'garden-district.jpg',
       'A grid of galleried mansions and cast-iron fences, about an hour on foot from Washington Avenue.'),
      poi('Oak Alley', 'oak-alley', 'oak-alley.jpg',
       'A quarter-mile tunnel of live oaks planted a century before the house behind them.')],
  10: [poi('Biloxi Lighthouse', 'biloxi-lighthouse', 'biloxi-lighthouse.jpg',
        'Cast iron, 1848, and standing on the central reservation of US-90.'),
       poi('Ocean Springs', 'ocean-springs', 'ocean-springs.jpg',
        'The shrimp fleet ties up here, and the pelicans sit on the pilings waiting for it.'),
       poi('USS Alabama', 'uss-alabama', 'uss-alabama.jpg',
        'Thirty-five thousand tons of battleship you can climb down inside, plus a submarine, for $18 an adult.')],
  11: [poi('Dexter Avenue Baptist Church', 'rosa-parks-museum', 'dexter-avenue.jpg',
        'Where a 26-year-old King was pastor, four blocks below the Alabama state capitol.'),
       poi('Atlanta', 'atlanta', 'atlanta.jpg',
        'Halfway home, and the last big city on the route.')],
  12: [poi('Charlotte', 'charlotte', 'charlotte.jpg',
        'The end of 240 miles of Piedmont pine, and the last night but one.')]
};

const MUST_SEE = [
  ['Luray Caverns', 2, 'luray-caverns.jpg', 'A steady 12°C underground on the coldest morning of the trip.'],
  ['The Ryman', 3, 'ryman-auditorium.jpg', 'For part of every winter the Opry moves back into the Mother Church.'],
  ['Country Music Hall of Fame', 4, 'country-music-hof.jpg', 'The Rotunda at the end of it is worth the ticket on its own.'],
  ['Graceland', 5, 'graceland.jpg', 'The biggest ticket on the route, and nobody regrets it.'],
  ['National Civil Rights Museum', 5, 'civil-rights-museum.jpg', 'The Lorraine Motel, balcony and all. The thing the older children remember.'],
  ['Clarksdale', 6, 'ground-zero.jpg', 'The Delta, the Crossroads, and lunch where the blues came from.'],
  ['Vicksburg National Military Park', 7, 'vicksburg-nmp.jpg', 'Sixteen miles of tour road and 1,325 monuments, covered by a $20 vehicle fee.'],
  ['Jackson Square', 8, 'jackson-square.jpg', 'The cathedral, the Cabildo and the Presbytère on three sides of it.'],
  ['Café du Monde', 8, 'cafe-du-monde.jpg', 'Beignets since 1862. You will wear the sugar.'],
  ['The St Charles streetcar', 9, 'st-charles-streetcar.jpg', '1923 cars, under the live oaks, $1.25 a ride.'],
  ['Oak Alley', 9, 'oak-alley.jpg', 'Three-hundred-year-old oaks in a quarter-mile tunnel.'],
  ['USS Alabama', 10, 'uss-alabama.jpg', 'Climb down through a battleship for $18 an adult and $6 a child.']
].map(([name, day, file, why]) => ({ name, day, photo: `${PHOTO}/${file}`, why }));

const WATCH_OUTS = [
  { title: 'Every high road in the mountains is shut',
    text: 'Skyline Drive closes along its whole 105 miles for days at a time — the entire road was gated ahead of one storm in late January 2026. Most of the Blue Ridge Parkway’s 469 miles sat closed through that month too. Kuwohi Road in the Smokies is gated from 1 December to 31 March every single year. This route is built so that none of it matters: it runs the valley floor on I-81 and spends its mountain morning inside a cave. Do not add a ridge road to the plan and expect it to be open.' },
  { title: 'Four freezing nights, and three more that are a coin toss',
    text: 'On the January average, Luray drops to −3°C, Bristol to −2°C, Nashville to 0°C and Fredericksburg to −1°C. Memphis, Atlanta and Charlotte each fall below freezing on roughly two nights in five. Pack for a winter trip at both ends and a mild one in the middle — New Orleans averages 16°C by day and freezes about one night in sixteen.' },
  { title: 'Check the Carnival calendar before you fix the dates',
    text: 'Carnival 2027 opens on Twelfth Night, Wednesday 6 January, with four parades that evening — the Phunny Phorty Phellows on a streetcar, the Funky Uptown Krewe behind them, the Société des Champs Élysée, and the Joan of Arc walking parade through the Quarter at eight. Mardi Gras itself is 9 February 2027, four weeks after this trip ends. Landing in New Orleans on or just after the 6th gets you the season’s opening at January prices; landing in February gets you a different holiday and a much bigger bill.' },
  { title: 'The alligators are asleep',
    text: 'Louisiana alligators brumate from about November to late February. A January swamp tour out of Barataria or Pearl River is a beautiful boat ride through bald cypress with almost no reptiles in it. Sell it to the children that way, or spend the afternoon at Oak Alley instead. This is the one place where a Florida winter genuinely beats a Louisiana one.' },
  { title: 'Nobody grits the Natchez Trace',
    text: 'The Parkway is never plowed, salted or sanded, and because it is lined with trees it holds ice long after the roads beside it have cleared. It closed south of Nashville for black ice and fallen trees in January 2025. This route only uses the twenty miles at the Natchez end, and US-61 runs parallel the whole way as a fallback — take it if there has been any freezing rain.' },
  { title: 'Two time zone crossings, and the second one hurts',
    text: 'You gain an hour near Crossville on day 3 and give it straight back between Montgomery and Atlanta on day 11. Day 11 is already the second-longest drive of the fortnight at 328 miles; on the clock it costs seven hours, not six. Start it early.' },
  { title: 'Sunday closes the Delta',
    text: 'Count the days forward before you book. The Delta Blues Museum shuts on Sundays and a good deal of Clarksdale goes with it, which would gut day 6. Moving the departure by a single day fixes it, and it is much cheaper to notice now than on US-61.' },
  { title: 'The last four days are the price of the loop',
    text: 'Days 11 to 14 cover 1,202 miles with Montgomery, Atlanta and Charlotte the only things on them. This is what a loop costs: the alternative is driving back up the Mississippi the way you came. It is still gentler than an out-and-back — no day on this route passes 350 miles, where a Florida run has two over 400.' },
  { title: 'Graceland and the aquarium are where the ticket money goes',
    text: 'Six people at Graceland is around $430 and the Georgia Aquarium is $350 to $425. Between them they are most of the entry-fee budget. Everything else on this route is $20 a vehicle, $18 a head or free — Vicksburg, the Trace, Emerald Mound, the Fredericksburg battlefield, the Peabody ducks and the Parthenon grounds cost almost nothing.' },
  { title: 'Six people, one vehicle, thirteen nights',
    text: 'A seven-seat minivan seats everyone but the space behind the third row will not take a fortnight of luggage for six. Either budget for a roof box or take a full-size SUV, which costs more to hire and roughly $130 more in fuel over this distance. Price both before you book, and book the vehicle by seatbelt count rather than by what the listing photograph suggests.' }
];

const ROUTE_PROS = [
  'A genuine loop. 2,926 miles and not one of them driven twice — down the inland side of the Appalachians, home along the Gulf and the Piedmont.',
  'Carnival opens on 6 January 2027 and Mardi Gras is not until 9 February, so New Orleans is inside the season and still in the cheapest, quietest fortnight of its year.',
  'No day over 350 miles, and three of the fourteen have no drive in them at all.',
  'Three nights in New Orleans, which is the longest single stop on any route on this site.',
  'Nashville and Memphis on the same line: the Ryman, the Hall of Fame, Graceland, Sun Studio and the Lorraine Motel inside three days.',
  'Almost no tolls between Virginia and Louisiana. The entire middle of this trip is free road.',
  'The far end is mild. New Orleans averages 16°C by day in January and freezes about one night in sixteen.'
];

const ROUTE_CONS = [
  'Four nights below freezing and three more that could go either way. This is a winter trip for the first three days and the last two.',
  'The mountains are scenery seen from the valley floor. Every high road on the route is gated for the season.',
  'Days 11 to 14 are 1,202 miles of interstate with three cities on them and not much else.',
  'Only New Orleans and Memphis get more than one night. Nashville gets an evening and a morning, which is not enough.',
  'The alligators are dormant, so a swamp tour is a boat ride through cypress rather than a wildlife trip.',
  '2,926 miles is nearly twice the Southwest Loop, and three children in the back will know it.'
];

/* ---------- costs ---------- */

const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);
const mkLines = (rows, a, b) => rows.map(([item, x, y, basis]) => ({ item, [a]: x, [b]: y, basis }));

const carLines = [
  ['Vehicle hire, 14 days', 1150, 1150,
    'Seven-seat minivan from a neighbourhood branch rather than Newark Airport. January is the cheapest month of the year for it.'],
  ['Fuel', 460, 420,
    'About 3,100 miles at roughly 24 mpg, at $3.30 a gallon — the EIA’s 2027 forecast. The value column drives more because it sleeps further out.'],
  ['Lodging, 13 nights', 2350, 3850,
    'Two rooms or one rental house. Best value sleeps in Metairie, Southaven and the airport side of Nashville; best location is walkable in every city.'],
  ['Food', 1700, 2100,
    'Six people, fourteen days, breakfasts in and a hot lunch on the road'],
  ['Parking', 110, 430,
    'Downtown hotel parking runs $25 to $45 a night in Nashville, Memphis, New Orleans and Atlanta. Out of the centre it is free.'],
  ['Luray Caverns', 162, 162, '$36 an adult and $18 for 6 to 12, booked online'],
  ['Country Music Hall of Fame', 162, 162, '$31.95 an adult and $21.95 for 6 to 12'],
  ['Opry at the Ryman', 220, 420, 'Six seats. Upper balcony against the floor, if the Opry is in residence on your dates.'],
  ['Graceland', 430, 500, 'Six on the Elvis Experience at about $85 an adult, plus parking'],
  ['National Civil Rights Museum', 99, 99, '$18 an adult and $15 for 5 to 17'],
  ['Sun Studio', 0, 105, 'Half an hour, about $17.50 a head. Skipped in the value column.'],
  ['Delta Blues Museum and Vicksburg', 65, 65, 'Museum entry for six, plus $20 for the vehicle at Vicksburg'],
  ['The National WWII Museum', 180, 260, 'Six at about $32 an adult; the higher column adds the Beyond All Boundaries film'],
  ['Oak Alley or a swamp tour', 117, 290, 'Oak Alley is $30 an adult and $9 for 6 to 17; a guided swamp boat runs $45 to $60 a head'],
  ['USS Alabama', 77, 77, '$18 an adult, $6 for 6 to 11, $5 to park'],
  ['Atlanta morning', 120, 360, 'Center for Civil and Human Rights against the Georgia Aquarium at $55 to $70 a head'],
  ['Tolls', 95, 95, 'The New Jersey Turnpike, the Delaware Memorial Bridge and the I-95 corridor. Nothing between Virginia and Louisiana.']
];

const rvLines = [
  ['Motorhome hire, 14 nights', 2100, 3150, 'Class C hired in New Jersey. Peer-to-peer listings run $175 to $225 a night in winter.'],
  ['Mileage over the daily allowance', 0, 520, 'Peer-to-peer hires typically include 100 to 150 miles a day. This route averages 209.'],
  ['De-winterizing', 60, 60, 'New Jersey rigs are drained from mid-October to late March'],
  ['Fuel', 1260, 1420, 'About 3,050 miles at 8 mpg, at $3.30 a gallon. This is the line that decides the argument.'],
  ['Campgrounds, 13 nights', 620, 1180,
    'Gulf-side state parks in January are the cheapest nights of the trip. New Orleans is the dear one, and northern Virginia in January is mostly shut.'],
  ['Food and groceries', 1050, 1450, 'Cooking in the motorhome with a few meals out'],
  ['Bedding and kitchen kit', 220, 320, 'Bought at home rather than paying per-person kit fees'],
  ['Luray Caverns', 162, 162, '$36 an adult and $18 for 6 to 12, booked online'],
  ['Country Music Hall of Fame', 162, 162, '$31.95 an adult and $21.95 for 6 to 12'],
  ['Opry at the Ryman', 220, 420, 'Six seats, if the Opry is in residence on your dates'],
  ['Graceland', 430, 500, 'Six on the Elvis Experience, plus oversize parking'],
  ['National Civil Rights Museum', 99, 99, '$18 an adult and $15 for 5 to 17'],
  ['Delta Blues Museum and Vicksburg', 65, 65, 'Museum entry for six, plus $20 for the vehicle at Vicksburg'],
  ['The National WWII Museum', 180, 260, 'Six at about $32 an adult'],
  ['Oak Alley or a swamp tour', 117, 290, 'Oak Alley is $30 an adult and $9 for 6 to 17'],
  ['USS Alabama', 77, 77, '$18 an adult, $6 for 6 to 11, $5 to park'],
  ['Tolls and city parking', 180, 390, 'Oversize vehicles pay more on the Turnpike, and the cities have nowhere cheap to leave one.']
];

const car = {
  id: 'car-and-lodging',
  name: 'Car and lodging',
  tagline: 'A hired van, thirteen nights booked, and every stop reachable',
  summary: 'The straightforward build and the one this route is designed around. Hire a seven-seat van at home, book thirteen nights, and keep the vehicle small enough to park in the French Quarter, downtown Nashville and downtown Memphis. Costs more per night than camping and around $800 less to fuel over this distance.',
  vehicle: {
    type: 'Seven-seat minivan or full-size SUV',
    detail: 'Chrysler Pacifica · Honda Odyssey · Toyota Sienna · Chevrolet Suburban',
    notes: 'Nothing on this route needs four-wheel drive. What it needs is a scraper in the boot and tyres with tread on them, because days 1 to 3 and day 13 run through country that ices overnight. Hire from a neighbourhood branch rather than Newark Airport — you are not flying, so there is no reason to pay the concession fee.'
  },
  costs: {
    currency: 'USD',
    columns: [{ key: 'value', label: 'Best value' }, { key: 'location', label: 'Best location' }],
    totals: { value: 0, location: 0 },
    lines: mkLines(carLines, 'value', 'location'),
    notes: 'Best value sleeps out of the centre everywhere — Metairie rather than the Quarter, Southaven rather than downtown Memphis — and skips the two dearest tickets. Best location is walkable in every city and takes everything. The gap is almost entirely lodging, parking and two entry fees.'
  },
  pros: [
    'Parks anywhere. The French Quarter, downtown Nashville and downtown Memphis are all walk-from-the-car stops.',
    'Roughly $800 less in fuel than the motorhome over 3,000 miles.',
    'No plumbing to freeze on days 1, 2, 3, 13 and 14, which is when this route is actually cold.',
    'Three of the fourteen days have no drive at all, so the vehicle sits still for a quarter of the trip.'
  ],
  cons: [
    'Thirteen check-ins for six people.',
    'Lodging is the largest line in the budget by a distance.',
    'The four days home are spent belted into seats.'
  ]
};

const rv = {
  id: 'motorhome',
  name: 'Motorhome',
  tagline: 'Cheaper at the bottom, colder at both ends, and no use in New Orleans',
  summary: 'A Class C hired in New Jersey. On paper it lands within $500 of the car build at the low end — the campground and food savings very nearly cover the hire and the fuel. What decides it is not money. It is a winterized rig leaving a freezing New Jersey, private campgrounds shut for the season on the two coldest nights, and a 30-footer that cannot go into the French Quarter, downtown Nashville or downtown Memphis — which is most of what this route is for.',
  vehicle: {
    type: 'Class C motorhome, around 30 ft',
    detail: 'Sleeps 6 to 7 · 6 to 7 seatbelts · roughly 8 mpg',
    notes: 'Book by seatbelt count rather than sleeping capacity, and get the mileage allowance in writing: at 2,926 miles a 100-mile daily cap adds around $500. Ask specifically whether the unit is winterized, what de-winterizing costs, and who pays if a pipe splits in the Shenandoah.'
  },
  costs: {
    currency: 'USD',
    columns: [{ key: 'low', label: 'Low' }, { key: 'high', label: 'High' }],
    totals: { low: 0, high: 0 },
    lines: mkLines(rvLines, 'low', 'high'),
    notes: 'The low column assumes a flat-rate hire with unlimited mileage and state park sites wherever they can be had. The high column is a peer-to-peer hire with a daily mileage cap and private parks at winter rates. The spread is wider than the car build because more of it is outside your control.'
  },
  pros: [
    'The four days home are far more bearable when three children can get out of their seats.',
    'No check-ins, and the food line drops by around $650.',
    'Gulf-side state parks in January are genuinely cheap, and the Trace has free campgrounds.',
    'Graceland has its own RV park, which is the one stop where it wins outright.'
  ],
  cons: [
    'About $800 more in fuel at 8 mpg over 3,000 miles.',
    'Winterized at both ends of the trip, with any freeze damage charged to you.',
    'The two coldest nights are the two where private campgrounds are most likely to be closed for the season.',
    'Barred or awkward at New Orleans, Nashville and Memphis — three of the four reasons to come.'
  ]
};

const FLAGS = {
  'car-and-lodging': {
    5: [{ type: 'note', label: 'Two car parks:', text: 'Graceland’s own is about $10 and the shuttle across the boulevard is included. Downtown Memphis hotel parking is $25 to $35 a night on top of that.' }],
    8: [{ type: 'unlocked', label: 'Park once for three days:', text: 'The Quarter is thirteen blocks by six and walkable end to end. The streetcar covers everything outside it for $3 a day.' }],
    12: [{ type: 'note', label: 'Book ahead:', text: 'The Georgia Aquarium is $70.77 at the gate and around $55 booked online for a weekday. For six that is a $95 difference for two minutes of admin.' }]
  },
  motorhome: {
    1: [{ type: 'blocked', label: 'Winterized:', text: 'New Jersey rigs are drained from mid-October to late March. De-winterize one and you leave a freezing New Jersey with live plumbing, and a split pipe is charged to you.' }],
    2: [{ type: 'blocked', label: 'Most sites are shut:', text: 'Private campgrounds in the Shenandoah and around the Tri-Cities close for the winter. What stays open is state park sites with no hook-ups, on the two coldest nights of the fortnight.' }],
    5: [{ type: 'unlocked', label: 'The day it wins outright:', text: 'Graceland has its own RV park across Elvis Presley Boulevard. You park, and you walk to the gates.' }],
    7: [{ type: 'note', label: 'Scout Emerald Mound first:', text: 'Vicksburg’s tour road takes a motorhome without trouble. The Emerald Mound car park is small and reached by a minor road — look at it on the map before you commit a 30-footer to it.' }],
    8: [{ type: 'blocked', label: 'Not into the Quarter:', text: 'Nothing that size goes into the French Quarter. The RV parks are out on the industrial canal or across the river, and you come in by bus, streetcar or ferry — which works, but it is not what you hired it for.' }],
    10: [{ type: 'unlocked', label: 'Made for this day:', text: 'US-90 along the Mississippi coast is flat and straight, and the Gulf-side state parks are the cheapest nights on the route.' }],
    13: [{ type: 'blocked', label: 'Freezing again:', text: 'Northern Virginia in January, and most campgrounds within reach of Fredericksburg are closed for the season. This is the night the motorhome costs you a hotel anyway.' }]
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
    ...(d.freezingNight ? { freezingNight: true } : {}),
    headline: d.headline,
    notes: d.notes,
    ...(d.activities ? { activities: d.activities } : {}),
    ...(POIS[d.day] ? { pois: POIS[d.day] } : {}),
    ...(VIA[d.day] ? { via: VIA[d.day] } : {}),
    route: [from.coords, to.coords]
  };
});

const route = {
  id: ID,
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/jackson-square.jpg`,
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
const milesSum = route.days.reduce((t, d) => t + d.miles, 0);
console.log('route     :', route.name);
console.log('days      :', route.days.length, '| must-see:', route.mustSee.length,
  '| watch-outs:', route.watchOuts.length, '| pros/cons:', route.pros.length + '/' + route.cons.length);
console.log('options   :', route.options.map((o) => `${o.name} $${o.costs.totals[o.costs.columns[0].key]}-${o.costs.totals[o.costs.columns[1].key]} (${Object.keys(o.flags).length} day flags)`).join(', '));
console.log('miles     :', milesSum, 'from the days |', route.totals.miles, 'stated |',
  milesSum === route.totals.miles ? 'match' : 'MISMATCH');
console.log('avg/day   :', Math.round(milesSum / route.days.length), 'computed |', route.totals.avgMilesPerDay, 'stated');
console.log('longest   :', Math.max(...route.days.map((d) => d.miles)), 'miles');
console.log('freezing  :', route.days.filter((d) => d.freezingNight).map((d) => d.day).join(', '));
console.log('costs     :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
console.log('no photo  :', missing.length ? missing.length + ' pois without photos: ' + missing.join(', ') : 'none');
