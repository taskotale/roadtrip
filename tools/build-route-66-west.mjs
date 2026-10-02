#!/usr/bin/env node
/* Rebuilds data/routes/route-66-west.json from source/route-66-west-trip-data.json.
   Run from the repo root:
       node tools/build-route-66-west.mjs
   then bake the road geometry:
       node tools/build-routes.mjs data/routes/route-66-west.json --force

   Same shape as tools/build-sonoran-loop.mjs. This is the site's first one-way
   route, so it sets "start" and "end" rather than "startEnd": the page then
   says "One way" and the map marks the last stop as the finish.

   Most days carry a "via" list. Those are there to hold the line on the right
   road, not to visit anything: on day 1 they keep it on free US-75 rather than
   the tollways, on day 2 they keep it on old 66 beside the Turner Turnpike
   rather than on it, on day 5 they run the Petrified Forest park road, and
   on day 6 they keep it on paved US-191 rather than the Hopi mesa dirt
   roads a router picks by default. Re-running this builder drops the baked
   geometry, so always re-bake with --force afterwards.

   The overnight stops were moved in October 2026 to keep the motorhome's
   plumbing out of the coldest towns: Albuquerque instead of Santa Fe, no night
   in Gallup, two nights in Williams (with the train to the rim) instead of the
   rim itself, and a night in Las Vegas between Death Valley and Los Angeles.
   Day 13 needs no Pahrump via: OSRM goes through it on Bell Vista Road and
   NV-160 by itself. It does hop 600 metres along a compacted track between
   two paved roads west of Pahrump, which is invisible at map scale and does
   not change the mileage. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const ID = 'route-66-west';
const PHOTO = `assets/photos/${ID}`;

const src = JSON.parse(await readFile(`${SITE}/source/${ID}-trip-data.json`, 'utf8'));
const C = JSON.parse(await readFile(process.argv[2] || `${SITE}/source/coords-${ID}.json`, 'utf8'));

const at = (key) => {
  const p = C[key];
  if (!p) throw new Error('missing coordinate for ' + key);
  return [p.lat, p.lng];
};
const place = (name, key) => ({ name, coords: at(key) });

const photoFiles = new Set(await readdir(`${SITE}/${PHOTO}`).catch(() => []));
const usedPhotos = new Set();

const poi = (name, key, photo, caption) => {
  const base = photo.replace(/\.jpg$/, '');
  const shots = [];
  if (photoFiles.has(photo)) { shots.push({ src: `${PHOTO}/${photo}`, caption: caption || '' }); usedPhotos.add(photo); }
  for (let n = 2; n <= 12; n++) {
    const f = `${base}-${n}.jpg`;
    if (photoFiles.has(f)) { shots.push({ src: `${PHOTO}/${f}` }); usedPhotos.add(f); }
    else if (n > 2) break;
  }
  return {
    name, coords: at(key),
    ...(caption ? { caption } : {}),
    ...(shots.length ? { photos: shots } : {})
  };
};

const STOPS = {
  1:  ['dallas', 'tulsa'],                       2:  ['tulsa', 'oklahoma-city'],
  3:  ['oklahoma-city', 'amarillo'],             4:  ['amarillo', 'albuquerque'],
  5:  ['albuquerque', 'holbrook'],               6:  ['holbrook', 'monument-valley'],
  7:  ['monument-valley', 'williams'],           8:  ['williams', 'williams'],
  9:  ['williams', 'kingman'],                   10: ['kingman', 'barstow'],
  11: ['barstow', 'furnace-creek'],              12: ['furnace-creek', 'furnace-creek'],
  13: ['furnace-creek', 'las-vegas'],            14: ['las-vegas', 'santa-monica'],
  15: ['santa-monica', 'lax']
};

const VIA = {
  1:  ['us75-mockingbird', 'us75-richardson', 'calvin-ok', 'wetumka-ok', 'weleetka-ok'],
  2:  ['blue-whale', 'ok66-southwest-blvd', 'ok66-sapulpa-west', 'ok66-kellyville', 'ok66-heyburn',
       'ok66-bristow-east', 'rock-cafe', 'davenport-ok', 'chandler-interpretive', 'wellston-ok',
       'luther-ok', 'round-barn'],
  3:  ['elk-city-museum', 'u-drop-inn', 'britten-tower'],
  4:  ['blue-swallow', 'blue-hole'],
  5:  ['tiponi-point', 'giant-logs'],
  6:  ['canyon-de-chelly-vc', 'kayenta'],
  7:  ['kayenta', 'cameron-trading-post', 'desert-view-watchtower', 'grand-canyon-village'],
  9:  ['seligman', 'hackberry-store'],
  10: ['oatman', 'needles', 'roys-motel-amboy', 'bagdad-cafe'],
  11: ['trona', 'stovepipe-wells'],
  13: ['zabriskie-point', 'death-valley-junction'],
  14: ['worlds-tallest-thermometer', 'barstow', 'pasadena', 'arroyo-seco']
};

const POIS = {
  1: [poi('The Meadow Gold sign', 'meadow-gold-sign', 'meadow-gold-sign.jpg',
        'Neon on 11th Street, which is Route 66. Lit after dark.'),
      poi('The Golden Driller', 'golden-driller', 'golden-driller.jpg',
        'A 75-foot oil worker at Expo Square, a mile off 66. Free, and lit at night.')],
  2: [poi('Blue Whale of Catoosa', 'blue-whale', 'blue-whale.jpg',
        'Built as an anniversary present in the early 1970s. Free, and you can walk into its mouth.'),
      poi('Rock Café', 'rock-cafe', 'rock-cafe.jpg',
        'Built of sandstone dug out when the road was laid. The obvious lunch.'),
      poi('Route 66 Interpretive Center', 'chandler-interpretive', 'chandler-interpretive.jpg',
        "In Chandler's 1937 armory. Sundays 1 to 5 only."),
      poi('Arcadia Round Barn', 'round-barn', 'round-barn.jpg',
        'A red round barn from 1898. Free, and the loft is one big round room.'),
      poi('Pops', 'pops-66', 'pops-66.jpg',
        'A 66-foot steel soda bottle that lights up after dark, and hundreds of sodas inside.')],
  3: [poi('National Route 66 Museum', 'elk-city-museum', 'elk-city-museum.jpg',
        "A street of old storefronts with the museum inside. Open on Mondays, unlike Clinton's."),
      poi('U-Drop Inn', 'u-drop-inn', 'u-drop-inn.jpg',
        "The 1936 Conoco station that became Ramone's in Cars."),
      poi('Leaning Tower of Britten', 'britten-tower', 'britten-tower.jpg',
        'A water tower tilted on purpose in 1980 to pull drivers off I-40.'),
      poi('Cadillac Ranch', 'cadillac-ranch', 'cadillac-ranch.jpg',
        'Ten Cadillacs nose-down in a field since 1974. Bring spray paint.'),
      poi('The Big Texan', 'big-texan', 'big-texan.jpg',
        'The 72-ounce steak is free if you finish it and the sides inside an hour.')],
  4: [poi('Blue Swallow Motel', 'blue-swallow', 'blue-swallow.jpg',
        'A 1939 motel with a garage beside every room. The sign is the photograph.'),
      poi('The Blue Hole', 'blue-hole', 'blue-hole.jpg',
        'An 80-foot artesian spring at a steady 18°C. Watch the divers.'),
      poi('KiMo Theatre', 'kimo', 'kimo-theatre.jpg',
        'Pueblo Deco from 1927, on Central Avenue — Route 66 through Albuquerque.'),
      poi('Old Town Albuquerque', 'albuquerque-old-town', 'albuquerque-old-town.jpg',
        'The plaza, and San Felipe de Neri on it since 1793.')],
  5: [poi('El Rancho Hotel', 'el-rancho', 'el-rancho.jpg',
        'Built in 1937 for the film crews. The lobby is lined with signed photographs.'),
      poi('The Painted Desert', 'tiponi-point', 'painted-desert.jpg',
        'Tiponi, Tawa, Kachina, Chinde and Pintado Points, all in the first few miles.'),
      poi('Painted Desert Inn', 'painted-desert-inn', 'painted-desert-inn.jpg',
        'An adobe inn on the rim, rebuilt in the 1930s and now a museum. Open about 9 to 4.'),
      poi('Route 66 and the Studebaker', 'route66-pullout', 'route66-studebaker.jpg',
        'Telephone poles and a 1932 Studebaker mark where 66 crossed the park.'),
      poi('Newspaper Rock', 'newspaper-rock', 'newspaper-rock.jpg',
        'More than 650 petroglyphs, seen through spotting scopes from the overlook.'),
      poi('Blue Mesa', 'blue-mesa', 'blue-mesa.jpg',
        'A one-mile loop down among banded badlands, with petrified logs lying in them.'),
      poi('Agate Bridge', 'agate-bridge', 'agate-bridge.jpg',
        'A 110-foot petrified log over a gully, held up with concrete since 1917.'),
      poi('Giant Logs', 'giant-logs', 'giant-logs.jpg',
        'The biggest logs in the park, on a short loop behind the Rainbow Forest Museum.'),
      poi('Wigwam Motel', 'wigwam-holbrook', 'wigwam-motel.jpg',
        'Fifteen concrete teepees from 1950. Two of them sleep six.')],
  6: [poi('Hubbell Trading Post', 'hubbell', 'hubbell.jpg',
        'Trading with Navajo families since 1878, and still a working store. Free.'),
      poi('White House Overlook', 'white-house-overlook', 'white-house-overlook.jpg',
        'A cliff dwelling 600 feet below the rim. The trail down is the only one you may walk without a Navajo guide.'),
      poi('Spider Rock', 'spider-rock-overlook', 'spider-rock.jpg',
        'An 800-foot spire at the end of the South Rim Drive. Free.'),
      poi('Monument Valley at sunset', 'monument-valley-mittens', 'monument-valley-mittens.jpg',
        'The Mittens as you arrive.')],
  7: [poi('The Valley Drive', 'john-fords-point', 'monument-valley-loop.jpg',
        'The 17-mile dirt loop. Gate at 8; last entry 2:30 in winter.'),
      poi('Wildcat Trail', 'monument-valley', 'wildcat-trail.jpg',
        'A free 3.2-mile loop around West Mitten Butte, open to everyone.'),
      poi('Little Colorado River Gorge', 'little-colorado-gorge', 'little-colorado-gorge.jpg',
        'A Navajo tribal park overlook. $8 a head, open 8:30 to 4:30.'),
      poi('Cameron Trading Post', 'cameron-trading-post', 'cameron-trading-post.jpg',
        'A 1916 trading post with a dining room and a hall full of Navajo rugs.'),
      poi('Desert View Watchtower', 'desert-view-watchtower', 'desert-view-watchtower.jpg',
        'The east entrance. Your first look at the canyon, and the best one.')],
  8: [poi('Grand Canyon Railway', 'grand-canyon-railway', 'grand-canyon-railway.jpg',
        'About two and a quarter hours each way from the depot in Williams, and a little under four at the rim.'),
      poi('Mather Point', 'mather-point', 'mather-point.jpg',
        'Beside the visitor centre, and the obvious first stop.'),
      poi('Yavapai Point', 'yavapai-point', 'yavapai-point.jpg',
        'The heated geology museum, and a view straight down to the river.'),
      poi('Bright Angel Trailhead', 'bright-angel-trailhead', 'bright-angel-trail.jpg',
        'Go down as far as the first switchbacks, then turn round.'),
      poi('Hopi Point', 'hopi-point', 'hopi-point.jpg',
        'The widest view on Hermit Road, and the sunset spot. By car only from December to February.'),
      poi('Hermits Rest', 'hermits-rest', 'hermits-rest.jpg',
        "Mary Colter's 1914 stone rest house at the end of Hermit Road.")],
  9: [poi('Williams', 'williams', 'williams.jpg',
         'The last Route 66 town the interstate bypassed, in October 1984.'),
      poi('Seligman', 'seligman', 'seligman-route66.jpg',
         "Where Angel Delgadillo's barbershop started the campaign that saved the road."),
      poi('Hackberry General Store', 'hackberry-store', 'hackberry-general-store.jpg',
         'Old pumps, older cars and a Corvette out front, halfway along the longest stretch of 66 left.'),
      poi('Kingman', 'kingman', 'kingman-route66.jpg',
         'Where the longest intact stretch of 66 comes down out of the desert.')],
  10: [poi('Oatman', 'oatman', 'oatman.jpg',
         'Wild burros on the main street. Use the burro food the shops sell.'),
       poi("Roy's Motel and Café", 'roys-motel-amboy', 'roys-motel.jpg',
         'The 1938 motel and café, and the sign everyone photographs.'),
       poi('Bagdad Café', 'bagdad-cafe', 'bagdad-cafe.jpg',
         'The Sidewinder Café that played the Bagdad Café in the 1987 film, and kept the name.')],
  11: [poi('Mesquite Flat Dunes', 'mesquite-flat-dunes', 'mesquite-flat-dunes.jpg',
         'Dunes the children can run down, right beside the road into the park.'),
       poi('Zabriskie Point', 'zabriskie-point', 'zabriskie-point.jpg',
         'Golden badlands at sunset, ten minutes from Furnace Creek.')],
  12: [poi('Badwater Basin', 'badwater-basin', 'badwater-basin.jpg',
         'The lowest point in North America — 282 feet below sea level.'),
       poi("Artist's Drive", 'artists-drive', 'artists-drive.jpg',
         'A one-way loop through mineral-stained hills. Nothing over 25 feet.'),
       poi('Golden Canyon', 'golden-canyon', 'golden-canyon.jpg',
         'An easy walk up a narrow canyon straight off the valley floor.'),
       poi("Dante's View", 'dantes-view', 'dantes-view.jpg',
         '5,475 feet up, looking straight down at Badwater.')],
  13: [poi('Amargosa Opera House', 'amargosa-opera-house', 'amargosa-opera-house.jpg',
         'Marta Becket painted the audience on the walls, then danced for it for more than forty years.'),
       poi('Welcome to Fabulous Las Vegas sign', 'welcome-sign', 'welcome-sign.jpg',
         'Up since 1959, with a small free lot in the median beside it.'),
       poi('Fountains of Bellagio', 'bellagio-fountains', 'bellagio-fountains.jpg',
         'Free, every fifteen minutes from 8 until midnight.')],
  14: [poi('Arroyo Seco Parkway', 'arroyo-seco', 'arroyo-seco-parkway.jpg',
         "America's first freeway, 1940, and Route 66's last stretch before downtown."),
       poi('Santa Monica Pier', 'pacific-park', 'pacific-park.jpg',
         'A Ferris wheel and a roller coaster at the end of the road, open into the evening on Fridays.')],
  15: [poi('End of the Trail', 'end-of-the-trail', 'end-of-the-trail.jpg',
         'The sign on Santa Monica Pier since 2009. The legal end of 66 is a mile inland, at Lincoln and Olympic.')]
};

const MUST_SEE = [
  ['Blue Whale of Catoosa', 2, 'blue-whale.jpg',
   'A concrete whale on a pond beside Route 66, built as an anniversary present. Walk into its mouth; it costs nothing.'],
  ['Cadillac Ranch', 3, 'cadillac-ranch.jpg',
   'Ten Cadillacs buried nose-down in a Panhandle field. Bring a can of spray paint and add a layer at sunset.'],
  ['The Painted Desert', 5, 'painted-desert.jpg',
   'Red and lavender badlands from a string of overlooks, and the only stretch of Route 66 inside a national park.'],
  ['Wigwam Motel', 5, 'wigwam-motel.jpg',
   'A night in a concrete teepee with 1950s cars parked outside. Two of them sleep six.'],
  ['Spider Rock', 6, 'spider-rock.jpg',
   'An 800-foot sandstone spire in Canyon de Chelly, at the end of a free rim drive most people never hear of.'],
  ['Monument Valley', 6, 'monument-valley-mittens.jpg',
   'Sunset over the Mittens on arrival, and the Valley Drive when the gate opens the next morning.'],
  ['The Grand Canyon Railway', 8, 'grand-canyon-railway.jpg',
   'A train from the middle of Williams to the South Rim and back — about two and a quarter hours each way through ponderosa pine, while the motorhome stays plugged in at the depot.'],
  ['Hopi Point', 8, 'hopi-point.jpg',
   'Sunset from the widest view on the South Rim, reached by car only from December to February.'],
  ['The burros of Oatman', 10, 'oatman.jpg',
   'Wild burros wander the main street of an old gold town and put their heads in the car window.'],
  ['Badwater Basin', 12, 'badwater-basin.jpg',
   'The lowest point in North America, 282 feet below sea level, and warm in January. Walk out onto the salt.'],
  ['The Fountains of Bellagio', 13, 'bellagio-fountains.jpg',
   'Water thrown high above the lake in time to music, every fifteen minutes after dark — free, outdoors, and fine for children, which most of the Strip is not.'],
  ['End of the Trail', 15, 'end-of-the-trail.jpg',
   'The sign on Santa Monica Pier that every Route 66 trip ends at, 2,647 miles after Dallas.']
].map(([name, day, photo, why]) => { usedPhotos.add(photo); return { name, day, photo: `${PHOTO}/${photo}`, why }; });

const pn = src.practical_notes;

const WATCH_OUTS = [
  { title: 'Book these first', text: pn.booking_order },
  { title: 'Eight freezing nights, then none', text: pn.freezing },
  { title: 'Freeze damage is charged to you', text: pn.freeze_damage, only: 'motorhome' },
  { title: 'If a line freezes', text: pn.thaw, only: 'motorhome' },
  { title: 'The depots set the ends of the trip', text: pn.pickup_windows, only: 'motorhome' },
  { title: 'Every toll is on day 1, and all of it is avoidable', text: pn.tolls },
  { title: 'A few things are shut on the day you pass them', text: pn.closed_days },
  { title: 'Monument Valley is an evening and a morning', text: pn.monument_valley },
  { title: 'The Monument Valley loop is dirt', text: pn.valley_drive_car, only: 'car-and-lodging' },
  { title: 'Day 14 is a long drive on the second-last day', text: pn.long_day },
  { title: 'Snow closes the high roads', text: pn.snow },
  { title: 'Death Valley is still repairing roads', text: pn.death_valley },
  { title: 'The park pass covers three parks, not the Navajo ones', text: pn.park_pass },
  { title: 'Two time zones, both in your favour', text: pn.time_zones },
  { title: 'California fuel costs more', text: pn.fuel }
];

const ROUTE_PROS = [
  'Route 66 for real: roughly 1,400 of its 2,448 miles, from Tulsa to the End of the Trail sign on Santa Monica Pier.',
  'All three must-stops — Monument Valley, the Grand Canyon and Death Valley — plus the only national park Route 66 runs through, and Canyon de Chelly, which is free.',
  'One way with no backtracking: 2,647 miles, and outside the Grand Canyon day barely a road driven twice.',
  'New ground for this site. Oklahoma, the Texas Panhandle, New Mexico and the Navajo Nation are on no other route.',
  'It gets warmer as it goes: eight cold nights, then Kingman, Barstow, Death Valley, Las Vegas and the beach.',
  'Two nights in Williams and two in Death Valley, which is where the two days without a drive belong — and a train to the Grand Canyon rim from the first.',
  'A night in Las Vegas on the way to the coast: the Welcome sign by daylight and the Bellagio fountains after dark, both free.',
  'The only tolls are on day 1, and a free road runs beside them.',
  'It finishes on a pier with a Ferris wheel, nine miles from the airport.'
];

const ROUTE_CONS = [
  '2,647 miles in fifteen days is 176 a day, against 110 on the Southwest Loop, with only two days off the road.',
  'Eight nights in a row below freezing before Kingman, the coldest about −7°C at Holbrook and Monument Valley.',
  'No Santa Fe: the Plaza, the Palace of the Governors and Loretto Chapel went with the cold, and Meow Wolf is now a car-only stop on the first morning.',
  'Monument Valley gets an evening and a morning, not a day, and Albuquerque only an evening. That was the price of Tulsa and Petrified Forest.',
  'Seven days are over 220 miles, the first of them straight off a flight, and day 5 adds three hours in Petrified Forest to 253 miles of driving.',
  'Day 14 is 290 miles into Los Angeles on a Friday, on the second-last day.',
  'The first three days are Oklahoma and the Texas Panhandle in January: flat, brown and windy. It is a road trip before it is a scenery trip.',
  'The western end overlaps the Las Vegas routes: Death Valley, the Grand Canyon, Monument Valley, Seligman, Oatman, Amboy and Las Vegas itself are each on at least one of them.',
  'Both vehicles have to be hired one way, and only one of the big motorhome companies would do it from Dallas.'
];

const FLAGS = {
  'car-and-lodging': {
    1: [{ type: 'note', label: 'Leave on US-75:',
          text: 'From Love Field it is two miles to US-75 with no toll road in between. From DFW, take I-635 east to US-75 rather than the Bush Turnpike.' },
        { type: 'unlocked', label: 'Open to you:',
          text: 'Meow Wolf, if the flight lands by about nine. The Real Unreal is in Grapevine Mills, five miles from DFW, and opens at 10 on Saturdays. Bags are not allowed inside and the lockers are small, so leave everything in the car. Two or three hours there puts you in Tulsa around seven rather than half past five.' }],
    7: [{ type: 'unlocked', label: 'Open to you:',
          text: 'Drive the 17-mile Valley Drive yourself when the gate opens at 8. It is graded dirt, and most hire agreements exclude unpaved roads — go slowly and stay on the loop, or book the guided tour instead.' }],
    8: [{ type: 'unlocked', label: 'Open to you:',
          text: 'Drive up rather than taking the train, and you have Hermit Road, seven miles out to Hermits Rest. Private cars are allowed only from December to February and only under 22 feet, which a minivan or a Suburban is. Hopi Point for sunset, then an hour back to Williams in the dark — watch for elk on AZ-64.' }],
    10: [{ type: 'unlocked', label: 'Open to you:',
           text: 'Sitgreaves Pass, the real Route 66 over the Black Mountains into Oatman: eight miles of hairpins with no shoulders. Legal for anything under 40 feet — check the hire agreement, which may say otherwise.' }],
    12: [{ type: 'unlocked', label: 'Open to you:',
           text: "Artist's Drive and the last climb to Dante's View, both closed to vehicles over 25 feet." }],
    14: [{ type: 'unlocked', label: 'Open to you:',
           text: "The Arroyo Seco Parkway, America's first freeway, which carries Route 66 from Pasadena into downtown. It was built for 45 mph, and the on-ramps start from a stop sign." }]
  },
  motorhome: {
    1: [{ type: 'blocked', label: 'Late away:',
          text: "El Monte's Dallas depot is in McKinney, 30 miles up US-75 and on the way — take a taxi from the airport. Pickup is after 1pm and the handover takes one to two hours, so you leave about 3 for the 238 miles to Tulsa, the last two of them in the dark. Book the Tulsa site for a late arrival." },
        { type: 'blocked', label: 'No Meow Wolf:',
          text: "Grapevine does not allow luggage inside and its lockers are small, and the motorhome is not yours until after 1pm in McKinney, forty miles the other way. With Santa Fe off the route, the motorhome build loses Meow Wolf altogether." },
        { type: 'note', label: 'Freezing from the first night.',
          text: 'Run the propane furnace, not the heat pump, which stops working around 4°C. Disconnect the city-water hose at night and run off the fresh tank; the hose freezes long before the tanks do.' }],
    4: [{ type: 'note', label: 'Open all winter:',
          text: "Albuquerque's RV parks stay open — the KOA Journey and American RV Resort, both just off I-40, have full hookups. Fill the propane here; the next planned fill is Williams." }],
    5: [{ type: 'note', label: 'No hookups at the Wigwam:',
          text: "Sleep at one of Holbrook's RV parks and walk over for the photographs — or book a wigwam for the night and leave the motorhome outside." }],
    6: [{ type: 'note', label: 'Hookups at Goulding’s:',
          text: "Goulding's campground has full hookups; The View's is dry camping only, on one of the coldest nights of the trip. Call ahead to check which is open in January." }],
    7: [{ type: 'blocked', label: 'Not in the motorhome:',
          text: 'The Navajo Nation bars RVs from the Valley Drive. The rim at the visitor centre and the 3.2-mile Wildcat Trail are free; a Navajo-guided tour — about $79 an adult and $59 a child — is the only way onto the valley floor.' },
        { type: 'note', label: 'Sleep beside the station:',
          text: 'The Grand Canyon Railway RV Park in Williams is open all winter, with full hookups on 124 paved sites next to the depot. Two nights, and you walk to the train.' }],
    8: [{ type: 'unlocked', label: 'Take the train:',
          text: 'Leave the motorhome plugged in at the depot and ride up. It stays on shore power with the furnace running all day, and nobody drives a 30-footer on an icy rim road. The return leaves the rim before sunset.' },
        { type: 'blocked', label: 'Not in the motorhome:',
          text: 'Hermit Road is private cars only in winter, and only under 22 feet, and no shuttle runs it until March. You have Mather and Yavapai Points, the Village rim and the Rim Trail.' }],
    10: [{ type: 'blocked', label: 'Not over Sitgreaves Pass.',
           text: 'The map takes I-40 from Kingman to Needles and rejoins the car at Amboy. If the burros matter, come at Oatman from the flat side — up from Topock and out on Boundary Cone Road — for about 48 more miles and two more hours.' }],
    11: [{ type: 'note', label: 'Low gear:',
           text: 'Towne Pass drops almost 5,000 feet into Stovepipe Wells. Use the gears, not the brakes.' }],
    12: [{ type: 'blocked', label: 'Not in the motorhome:',
           text: "Artist's Drive and the last climb to Dante's View are closed to vehicles over 25 feet. Badwater, Devil's Golf Course and Golden Canyon are open to you." }],
    13: [{ type: 'note', label: 'Sleep at the Oasis:',
           text: 'Oasis Las Vegas RV Resort, a mile and a half from the Welcome sign, has full hookups on concrete pads. Take a taxi to the Bellagio rather than hunting for somewhere on the Strip to leave 30 feet of motorhome; the lot at the sign has two bus bays.' }],
    14: [{ type: 'blocked', label: 'Not on the Arroyo Seco.',
           text: 'Narrow 1940 lanes, tight curves and stop-sign on-ramps are no place for a 30-footer. The map takes I-10 instead.' },
         { type: 'note', label: 'Sleep at Dockweiler.',
           text: "Santa Monica does not let oversized vehicles park on its streets overnight without a permit. Dockweiler RV Park, the county's beach campground nine miles south under the LAX flight path, takes bookings no more than 90 days ahead — book it the day that window opens." }],
    15: [{ type: 'note', label: 'Back in the morning:',
           text: 'Return it to El Monte in Santa Fe Springs, 23 miles from Dockweiler, in their morning window (9 to 10:30 at McKinney), then take a taxi the 23 miles to LAX. Book a flight after about 1pm.' }]
  }
};

/* Where the motorhome has to take a different road from the car. */
const DAY_VIA = {
  motorhome: {
    10: ['needles', 'roys-motel-amboy', 'bagdad-cafe'],            // I-40 round Sitgreaves Pass
    14: ['worlds-tallest-thermometer', 'barstow', 'i10-ontario'],   // I-10, not the Arroyo Seco
    15: ['dockweiler-rv', 'el-monte-santa-fe-springs']             // night at Dockweiler, return in Santa Fe Springs
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
    ...(typeof d.elevation_ft === 'number' ? { elevation: d.elevation_ft } : {}),
    freezingNight: !!d.freezing_night,
    activities: d.activities || [],
    pois: POIS[d.day] || []
  };
  if (VIA[d.day]) day.via = VIA[d.day].map(at);
  if (d.drive_time) day.driveTime = d.drive_time;
  return day;
});

const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);
const estimates = [];

const costsFrom = (optId, budget) => {
  const lines = budget.lines.map((l) => {
    if (l.estimate) estimates.push(`${optId}: ${l.item}`);
    const out = { item: l.item };
    budget.columns.forEach((c) => { out[c.key] = l[c.key]; });
    out.basis = l.basis;
    return out;
  });
  return {
    currency: 'USD',
    columns: budget.columns,
    totals: Object.fromEntries(budget.columns.map((c) => [c.key, sumLines(lines, c.key)])),
    lines,
    notes: budget.notes
  };
};

const options = src.options.map((o) => ({
  id: o.id,
  name: o.name,
  tagline: o.tagline,
  summary: o.summary,
  vehicle: o.vehicle,
  costs: costsFrom(o.id, o.budget),
  pros: o.pros,
  cons: o.cons,
  flags: FLAGS[o.id] || {},
  ...(DAY_VIA[o.id] ? {
    dayVia: Object.fromEntries(Object.entries(DAY_VIA[o.id]).map(([dn, keys]) => [dn, keys.map(at)]))
  } : {})
}));

const HERO = 'wigwam-motel.jpg';
usedPhotos.add(HERO);

const route = {
  id: ID,
  name: src.trip.title,
  subtitle: src.trip.subtitle,
  summary: src.trip.summary,
  hero: `${PHOTO}/${HERO}`,
  season: src.trip.season,
  start: src.trip.start,
  end: src.trip.end,
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
  options,
  days
};

await mkdir(`${SITE}/data/routes`, { recursive: true });
const json = JSON.stringify(route, null, 2) + '\n';
await writeFile(`${SITE}/data/routes/${ID}.json`, json);

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
const miles = route.days.reduce((t, d) => t + d.miles, 0);
const avg = Math.round(miles / route.days.length);
const missing = route.days.flatMap((dy) => (dy.pois || []).filter((p) => !p.photos).map((p) => p.name));
const ghosts = [...usedPhotos].filter((f) => !photoFiles.has(f));
const spare = [...photoFiles].filter((f) => f.endsWith('.jpg') && !usedPhotos.has(f));
const fahrenheit = json.match(/°F|fahrenheit/gi) || [];

console.log('route     :', route.name);
console.log('days      :', route.days.length, '| must-see:', route.mustSee.length,
  '| watch-outs:', route.watchOuts.length, '| pros/cons:', route.pros.length + '/' + route.cons.length);
console.log('miles     :', miles, miles === route.totals.miles ? '(matches totals)' : `(totals say ${route.totals.miles})`,
  '| avg', avg, avg === route.totals.avgMilesPerDay ? '(matches)' : `(totals say ${route.totals.avgMilesPerDay})`);
console.log('options   :', route.options.map((o) => `${o.name} ${JSON.stringify(o.costs.totals)} (${Object.keys(o.flags).length} day flags)`).join(', '));
console.log('costs     :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
console.log('estimates :', estimates.length ? 'STILL ESTIMATED — ' + estimates.join('; ') : 'none');
console.log('no photo  :', missing.length ? missing.join(', ') : 'none');
console.log('photos    :', usedPhotos.size, 'used,', ghosts.length ? 'MISSING ' + ghosts.join(', ') : 'none missing',
  '|', spare.length ? 'unused in folder: ' + spare.join(', ') : 'none unused');
console.log('fahrenheit:', fahrenheit.length ? 'FOUND ' + fahrenheit.length : 'none');
