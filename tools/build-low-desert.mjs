#!/usr/bin/env node
/* Rebuilds BOTH Low Desert routes from source/low-desert-trip-data.json:

       data/routes/low-desert-short.json   10 days
       data/routes/low-desert-loop.json    15 days, finishing at Valley of Fire, last night in Las Vegas

   Run from the repo root:
       node tools/build-low-desert.mjs
   then bake the road geometry for each:
       node tools/build-routes.mjs data/routes/low-desert-short.json
       node tools/build-routes.mjs data/routes/low-desert-loop.json

   The two are versions of one trip: same stops, same watch-outs, same money
   savers, same photos. One source file and one builder keeps them from drifting
   apart — change a watch-out once and both routes get it. They also share a
   photo folder, so overwriting a picture updates both, which is what you want
   when it is the same place on both.

   Same shape as tools/build-southwest-loop.mjs otherwise. */
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const SITE = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PHOTO = 'assets/photos/low-desert-loop';   // shared by both versions

const src = JSON.parse(await readFile(`${SITE}/source/low-desert-trip-data.json`, 'utf8'));
const C = JSON.parse(await readFile(process.argv[2] || `${SITE}/source/coords-low-desert-loop.json`, 'utf8'));

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

/* ---- every point of interest either version can use, defined once ---- */
const P = {
  zabriskie:   () => poi('Zabriskie Point', 'zabriskie-point', 'zabriskie-point.jpg',
                 'Golden badlands at sunset, ten minutes from Furnace Creek.'),
  badwater:    () => poi('Badwater Basin', 'badwater-basin', 'badwater-basin.jpg',
                 'The lowest point in North America — 282 ft below sea level.'),
  goldenCanyon:() => poi('Golden Canyon', 'golden-canyon', 'golden-canyon.jpg',
                 'An easy walk up a narrow canyon straight off the valley floor.'),
  artistsDrive:() => poi("Artist's Drive", 'artists-drive', 'artists-drive.jpg',
                 'A one-way loop through mineral-stained hills.'),
  dunes:       () => poi('Mesquite Flat Dunes', 'mesquite-flat-dunes', 'mesquite-flat-dunes.jpg',
                 'Best at sunrise before the wind picks up.'),
  mosaic:      () => poi('Mosaic Canyon', 'mosaic-canyon', 'mosaic-canyon.jpg',
                 'Polished marble narrows, a mile up from the car park.'),
  dantes:      () => poi("Dante's View", 'dantes-view', 'dantes-view.jpg',
                 '5,450 ft up, looking straight down at Badwater. The one cold place on this route.'),
  calico:      () => poi('Calico Ghost Town', 'calico-ghost-town', 'calico-ghost-town.jpg',
                 'A silver town that went bust in 1896, rebuilt as a park.'),
  elmers:      () => poi("Elmer's Bottle Tree Ranch", 'elmers-bottle-tree-ranch', 'elmers-bottle-tree-ranch.jpg',
                 'A forest of steel trees hung with thousands of glass bottles. Free, on the old road.'),
  tramway:     () => poi('Palm Springs Aerial Tramway', 'tramway-mountain-station', 'palm-springs-tramway.jpg',
                 '2,600 ft to 8,500 ft in ten minutes. Shirtsleeves at the bottom, snow at the top.'),
  indianCanyons:() => poi('Indian Canyons', 'indian-canyons', 'indian-canyons.jpg',
                 'A real palm oasis on Agua Caliente land, and a walk that suits everyone.'),
  saltonSea:   () => poi('Salton Sea', 'salton-sea-north-shore', 'salton-sea.jpg',
                 '230 ft below sea level, and only here because a canal broke in 1905.'),
  galleta:     () => poi('Galleta Meadows', 'galleta-meadows', 'galleta-meadows.jpg',
                 '130 life-size metal sculptures scattered across open land. No gate, no ticket.'),
  palmCanyon:  () => poi('Borrego Palm Canyon', 'borrego-palm-canyon', 'borrego-palm-canyon.jpg',
                 'Three miles round trip to a palm grove and, in a wet year, a waterfall.'),
  slot:        () => poi('The Slot', 'the-slot', 'the-slot.jpg',
                 'A real slot canyon you walk yourself. No permit, no guide, no fee.'),
  fontsPoint:  () => poi("Font's Point", 'fonts-point', 'fonts-point.jpg',
                 'The best view in the park — at the end of four miles of soft sand. 4WD only.'),
  cholla:      () => poi('Cholla Cactus Garden', 'cholla-cactus-garden', 'cholla-cactus-garden.jpg',
                 'Ten acres of teddy-bear cholla on a quarter-mile loop. Do not touch them.'),
  keysView:    () => poi('Keys View', 'keys-view', 'keys-view.jpg',
                 '5,185 ft, looking down on the Coachella Valley and the San Andreas Fault.'),
  hiddenValley:() => poi('Hidden Valley', 'hidden-valley', 'hidden-valley.jpg',
                 'A one-mile loop into a rock-walled bowl that cattle rustlers used to hide stock.'),
  barkerDam:   () => poi('Barker Dam', 'barker-dam', 'barker-dam.jpg',
                 'A 1900s ranchers’ reservoir, petroglyphs, and a 1.3-mile flat loop.'),
  skullRock:   () => poi('Skull Rock', 'skull-rock', 'skull-rock.jpg',
                 'Right beside the road, and the one the kids will want photographed.'),
  archRock:    () => poi('Arch Rock', 'arch-rock', 'arch-rock.jpg',
                 'A short walk from White Tank to a 30-foot granite arch.'),
  amboy:       () => poi('Amboy Crater', 'amboy-crater', 'amboy-crater.jpg',
                 'A 250-foot cinder cone you can walk into, off the emptiest part of Route 66.'),
  roys:        () => poi("Roy's Motel and Cafe", 'roys-motel-amboy', 'roys-motel.jpg',
                 'One neon sign in an empty town. The photograph everybody takes.'),
  oatman:      () => poi('Oatman', 'oatman', 'oatman.jpg',
                 'Wild burros in the street, on the Route 66 pass the motorhome cannot take.'),
  kingman:     () => poi('Kingman', 'kingman', 'kingman-route66.jpg',
                 'Where Route 66 crosses US-93. The Powerhouse museum and the old depot.'),
  hooverDam:   () => poi('Hoover Dam', 'hoover-dam', 'hoover-dam.jpg',
                 'Park and walk out onto the bridge — 20 minutes, no ticket needed.'),
  valleyOfFire:() => poi('Valley of Fire', 'valley-of-fire', 'valley-of-fire.jpg',
                 "Nevada's oldest state park, and bright red the whole way through."),
  atlatlRock:  () => poi('Atlatl Rock', 'atlatl-rock', 'atlatl-rock.jpg',
                 'Petroglyphs up a steel staircase.'),
  fireWave:    () => poi('Fire Wave', 'fire-wave', 'fire-wave.jpg',
                 'Striped Aztec sandstone, a short walk that suits kids.'),
  whiteDomes:  () => poi('White Domes', 'white-domes', 'white-domes.jpg',
                 'A slot canyon, a 1960s film set, and the best loop in the park.'),
  elephantRock:() => poi('Elephant Rock', 'elephant-rock', 'elephant-rock.jpg',
                 'Ten minutes from the east entrance, and it really does look like one.')
};

/* ---- what changes between the two versions ---- */
const SHAPE = {
  short: {
    stops: {
      1: ['las-vegas', 'furnace-creek'],       2: ['furnace-creek', 'furnace-creek'],
      3: ['furnace-creek', 'barstow'],         4: ['barstow', 'palm-springs'],
      5: ['palm-springs', 'borrego-springs'],  6: ['borrego-springs', 'twentynine-palms'],
      7: ['twentynine-palms', 'twentynine-palms'], 8: ['twentynine-palms', 'needles'],
      9: ['needles', 'las-vegas'],             10: ['las-vegas', 'las-vegas-airport']
    },
    via: { 4: ['elmers-bottle-tree-ranch'], 8: ['amboy-crater'], 9: ['kingman'] },
    pois: {
      1: ['zabriskie'],
      2: ['badwater', 'goldenCanyon', 'artistsDrive', 'dunes'],
      3: ['calico'],
      4: ['elmers', 'tramway'],
      5: ['indianCanyons', 'saltonSea', 'galleta', 'slot'],
      6: ['palmCanyon', 'cholla', 'keysView'],
      7: ['hiddenValley', 'barkerDam', 'skullRock', 'archRock'],
      8: ['amboy', 'roys'],
      9: ['oatman', 'kingman', 'hooverDam'],
      10: []
    },
    mustSee: [
      ['Zabriskie Point', 1, 'zabriskie-point.jpg',
       'Golden badlands at sunset, ten minutes from where you sleep. The best view in Death Valley for the least effort.'],
      ['Badwater Basin', 2, 'badwater-basin.jpg',
       'The lowest point in North America, 282 ft below sea level, at 18°C in January. Walk out onto the salt flats.'],
      ["Elmer's Bottle Tree Ranch", 4, 'elmers-bottle-tree-ranch.jpg',
       'Free, on the old Route 66 alignment, and unlike anything else on either version. Ten minutes, and worth the detour.'],
      ['Palm Springs Aerial Tramway', 4, 'palm-springs-tramway.jpg',
       'Ten minutes from the valley floor to 8,500 feet. The only snow anyone will see on this trip, and you choose whether to go up to it.'],
      ['Galleta Meadows', 5, 'galleta-meadows.jpg',
       'A 350-foot steel serpent crossing a road in the desert, and 129 other sculptures. Free, and the best surprise on the route.'],
      ['The Slot', 5, 'the-slot.jpg',
       'A slot canyon you walk yourself, with no permit and no guide. The Southwest Loop pays about $580 for six to do this at Antelope.'],
      ['Cholla Cactus Garden', 6, 'cholla-cactus-garden.jpg',
       'Ten acres of teddy-bear cholla lit from behind at the end of the day. A quarter-mile loop, and the best photograph in Joshua Tree.'],
      ['Skull Rock', 7, 'skull-rock.jpg',
       'Right beside the road, and the one every child on this trip will want a photograph of.'],
      ["Roy's Motel, Route 66", 8, 'roys-motel.jpg',
       'One neon sign in an abandoned town in the middle of the Mojave. This is the one the kids will talk about.'],
      ['The burros at Oatman', 9, 'oatman.jpg',
       'Wild burros that walk up to the car window in the street. Car build only — the pass is no place for a 30-footer.']
    ],
    carDetour: { 9: ['oatman', 'kingman'] },
    flags: {
      motorhome: {
        2: [{ type: 'blocked', label: 'Not in the motorhome:',
              text: "Artist's Drive is closed to vehicles over 25 ft. Take the separate rental car — it is in the budget for exactly this. Dante's View has the same limit, but it is not on this version anyway." }],
        6: [{ type: 'note', label: 'You sleep in town, not in the park.',
              text: "Joshua Tree's own campgrounds cap at around 25 to 35 ft and have no hookups, no dump station and mostly no water. A full-hookup site in Twentynine Palms costs about the same and you are ten minutes from the north entrance. The park roads themselves are fine in a 30-footer." }],
        9: [{ type: 'blocked', label: 'Not in the motorhome:',
              text: 'The Oatman Highway over Sitgreaves Pass — steep, blind hairpins, no room for a 30-footer. The map shows the I-40 route through Kingman, which is ten miles longer and half an hour faster.' }]
      },
      'car-and-lodging': {
        2: [{ type: 'unlocked', label: 'Open to you:',
              text: "Artist's Drive, with no second rental car needed." }],
        9: [{ type: 'unlocked', label: 'Open to you:',
              text: 'The Oatman Highway. Ten miles shorter than the interstate and half an hour slower, because it is a mountain pass with hairpins — and the wild burros come to the car window. Check the rental agreement first; many effectively prohibit Sitgreaves Pass. The map shows the detour.' }]
      }
    },
    pros: [
      'Ten days, and it still gets Death Valley, two national parks, three state parks and 200 miles of original Route 66.',
      'No night is expected to freeze. Nothing on this route sleeps above 2,200 feet.',
      'Needles sits at 495 feet on the Colorado — the warmest bed of the trip, and genuinely on Route 66.',
      'January is the best month of the year to be in the low desert. Palm Springs runs to 21 or 22°C and Death Valley to around 18°C.',
      'The motorhome stops being a compromise. Its worst problem on the Southwest Loop was seven freezing nights, and this route does not have one.',
      'One set of flights, one vehicle, one loop. Nothing is one-way.'
    ],
    cons: [
      'The driving is almost the same as the long version — 945 miles against 1,055 — so this is a busier trip rather than a smaller one.',
      'Only two of the ten days involve no driving between towns. The long version has five.',
      'Death Valley gets one full day. Dante’s View and Mosaic Canyon do not fit.',
      'Anza-Borrego gets an afternoon and a morning, which is enough for The Slot and Borrego Palm Canyon and nothing else.',
      'Needles is a faded railroad town and the lodging is basic motels. Lake Havasu is 42 miles south if the party would rather have a proper room.',
      'No Valley of Fire. Finishing on the red rock is what the long version buys.'
    ]
  },

  long: {
    stops: {
      1: ['las-vegas', 'furnace-creek'],       2: ['furnace-creek', 'furnace-creek'],
      3: ['furnace-creek', 'furnace-creek'],   4: ['furnace-creek', 'barstow'],
      5: ['barstow', 'palm-springs'],          6: ['palm-springs', 'borrego-springs'],
      7: ['borrego-springs', 'borrego-springs'], 8: ['borrego-springs', 'twentynine-palms'],
      9: ['twentynine-palms', 'twentynine-palms'], 10: ['twentynine-palms', 'needles'],
      11: ['needles', 'boulder-city'],         12: ['boulder-city', 'valley-of-fire'],
      13: ['valley-of-fire', 'valley-of-fire'], 14: ['valley-of-fire', 'las-vegas'],
      15: ['las-vegas', 'las-vegas-airport']
    },
    via: { 5: ['elmers-bottle-tree-ranch'], 10: ['amboy-crater'], 11: ['kingman'] },
    pois: {
      1: ['zabriskie'],
      2: ['badwater', 'goldenCanyon', 'artistsDrive'],
      3: ['dunes', 'mosaic', 'dantes'],
      4: ['calico'],
      5: ['elmers', 'tramway'],
      6: ['indianCanyons', 'saltonSea', 'galleta'],
      7: ['palmCanyon', 'slot', 'fontsPoint'],
      8: ['cholla', 'keysView'],
      9: ['hiddenValley', 'barkerDam', 'skullRock', 'archRock'],
      10: ['amboy', 'roys'],
      11: ['oatman', 'kingman', 'hooverDam'],
      12: ['valleyOfFire', 'atlatlRock'],
      13: ['fireWave', 'whiteDomes', 'elephantRock'],
      14: [],
      15: []
    },
    mustSee: [
      ['Zabriskie Point', 1, 'zabriskie-point.jpg',
       'Golden badlands at sunset, ten minutes from where you sleep. The best view in Death Valley for the least effort.'],
      ['Badwater Basin', 2, 'badwater-basin.jpg',
       'The lowest point in North America, 282 ft below sea level, at 18°C in January. Walk out onto the salt flats.'],
      ['Mesquite Flat Dunes', 3, 'mesquite-flat-dunes.jpg',
       'Go at sunrise. Dunes the kids can run down, before the wind picks up and the light goes flat.'],
      ["Elmer's Bottle Tree Ranch", 5, 'elmers-bottle-tree-ranch.jpg',
       'Free, on the old Route 66 alignment, and unlike anything else on either version. Ten minutes, and worth the detour.'],
      ['Palm Springs Aerial Tramway', 5, 'palm-springs-tramway.jpg',
       'Ten minutes from the valley floor to 8,500 feet. The only snow anyone will see on this trip, and you choose whether to go up to it.'],
      ['Galleta Meadows', 6, 'galleta-meadows.jpg',
       'A 350-foot steel serpent crossing a road in the desert, and 129 other sculptures. Free, and the best surprise on the route.'],
      ['The Slot', 7, 'the-slot.jpg',
       'A slot canyon you walk yourself, with no permit and no guide. The Southwest Loop pays about $580 for six to do this at Antelope.'],
      ['Cholla Cactus Garden', 8, 'cholla-cactus-garden.jpg',
       'Ten acres of teddy-bear cholla lit from behind at the end of the day. A quarter-mile loop, and the best photograph in Joshua Tree.'],
      ['Skull Rock', 9, 'skull-rock.jpg',
       'Right beside the road, and the one every child on this trip will want a photograph of.'],
      ["Roy's Motel, Route 66", 10, 'roys-motel.jpg',
       'One neon sign in an abandoned town in the middle of the Mojave. This is the one the kids will talk about.'],
      ['The Fire Wave', 13, 'fire-wave.jpg',
       'Striped red and white sandstone at the end of a short flat walk, on the last full day. A better finish than a car park near the airport.']
    ],
    carDetour: { 11: ['oatman', 'kingman'] },
    flags: {
      motorhome: {
        2: [{ type: 'blocked', label: 'Not in the motorhome:',
              text: "Artist's Drive is closed to vehicles over 25 ft. Take the separate rental car — it is in the budget for exactly this." }],
        3: [{ type: 'blocked', label: 'Not in the motorhome:',
              text: "The final climb to Dante's View has the same 25 ft limit. Rental car again. These two are the only places in Death Valley the motorhome cannot go." }],
        7: [{ type: 'blocked', label: 'Not in the motorhome:',
              text: "Font's Point — four miles of soft sand off the Borrego Salton Seaway. Nothing without four-wheel drive gets there, so this one is out for the car build too." }],
        8: [{ type: 'note', label: 'You sleep in town, not in the park.',
              text: "Joshua Tree's own campgrounds cap at around 25 to 35 ft and have no hookups, no dump station and mostly no water. A full-hookup site in Twentynine Palms costs about the same and you are ten minutes from the north entrance." }],
        11: [{ type: 'blocked', label: 'Not in the motorhome:',
               text: 'The Oatman Highway over Sitgreaves Pass — steep, blind hairpins, no room for a 30-footer. The map shows the I-40 route through Kingman, which is ten miles longer and half an hour faster.' }],
        12: [{ type: 'unlocked', label: 'The one night you have the better bed:',
               text: 'There is no hotel inside Valley of Fire. Atlatl Rock campground has hookups and puts you in the park for sunrise on the sandstone. Reserve it — all sites are reservation-only.' }],
        14: [{ type: 'note', label: 'The motorhome goes back today.',
               text: 'Hand it back when you reach Las Vegas. Allow half a day for the return process, then a hotel for the last night — the flight morning stays simple.' }]
      },
      'car-and-lodging': {
        2: [{ type: 'unlocked', label: 'Open to you:',
              text: "Artist's Drive, with no second rental car needed." }],
        3: [{ type: 'unlocked', label: 'Open to you:',
              text: "The climb to Dante's View, 5,450 ft up over Badwater." }],
        7: [{ type: 'note', label: 'Still not open to you:',
              text: "Font's Point needs four-wheel drive — four miles of soft sand, and it strands two-wheel-drive vehicles regularly. A minivan will not make it. This is the one place on the route neither build reaches without renting something else for the day." }],
        11: [{ type: 'unlocked', label: 'Open to you:',
               text: 'The Oatman Highway. Ten miles shorter than the interstate and half an hour slower, because it is a mountain pass with hairpins — and the wild burros come to the car window. Check the rental agreement first; many effectively prohibit Sitgreaves Pass. The map shows the detour.' }],
        12: [{ type: 'note', label: 'No rooms in the park.',
               text: 'Valley of Fire has campgrounds and nothing else. The nearest rooms are in Overton, about fifteen minutes from the east entrance — which means driving back in for sunrise if you want it.' }]
      }
    },
    pros: [
      'No night is expected to freeze. Nothing on this route sleeps above 2,600 feet.',
      'Two national parks, four state parks and 200 miles of original Route 66, out and back from a single airport.',
      'Short days: 94 miles a day on average, and five of the fifteen involve no driving between towns.',
      'It finishes on the red rock at Valley of Fire rather than in a car park near the airport, then an easy 63-mile morning back to Las Vegas and a last night before the flight.',
      'January is the best month of the year to be in the low desert. Palm Springs runs to 21 or 22°C and Death Valley to around 18°C.',
      'The motorhome stops being a compromise. Its worst problem on the Southwest Loop was seven freezing nights, and this route does not have one.'
    ],
    cons: [
      'Two national parks instead of five. The warm places are the low places, and the famous parks are nearly all high.',
      'January is high season in the Coachella Valley, so Palm Springs is the one expensive stop — the reverse of the Southwest Loop, where the cold made everything cheap.',
      'Day 4 is 177 miles of mostly empty desert between Death Valley and Route 66. It is the longest day on the route.',
      "Font's Point needs four-wheel drive — four miles of soft sand. Neither build reaches it.",
      'Needles is a faded railroad town and the lodging is basic motels. It is on the route because it is warm and on Route 66, not because it is comfortable.',
      'Death Valley still has flood damage: Scotty’s Castle and Bonnie Clare Road are closed indefinitely, and several roads have soft shoulders and unpaved sections.'
    ]
  }
};

const pn = src.practical_notes;
const watchOutsFor = (which) => [
  { title: 'Book Palm Springs first, then Borrego', text: pn.booking_order },
  { title: 'It is warm, not hot', text: pn.warm_weather },
  { title: 'Needles is warm, not smart', text: pn.needles },
  ...(which === 'long' ? [{ title: "Font's Point is a four-wheel-drive road", text: pn.fonts_point }] : []),
  ...(which === 'long' ? [{ title: 'There is no hotel inside Valley of Fire', text: pn.valley_of_fire }] : []),
  { title: 'Death Valley is still closing roads', text: pn.death_valley_closures },
  { title: 'Long empty stretches — fill up early', text: pn.fuel },
  { title: 'The park pass does not cover the state parks', text: pn.state_parks },
  { title: 'The Oatman Highway is not for everybody', text: pn.oatman_highway }
];

const sumLines = (lines, key) => lines.reduce((t, l) => t + (l[key] || 0), 0);

function buildVersion(which) {
  const v = src.versions[which];
  const shape = SHAPE[which];

  const days = v.itinerary.map((d) => {
    const [fromKey, toKey] = shape.stops[d.day];
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
      pois: (shape.pois[d.day] || []).map((k) => {
        if (!P[k]) throw new Error(`${which} day ${d.day}: no point of interest called "${k}"`);
        return P[k]();
      })
    };
    if (shape.via[d.day]) day.via = shape.via[d.day].map(at);
    if (d.drive_time) {
      day.driveTime = d.drive_time.replace(/^(\d+)h(\d+)$/, (_, h, m) => m === '00' ? `${h}h` : `${h}h ${m}m`);
    }
    return day;
  });

  /* ---- motorhome ---- */
  const mh = src.options.motorhome;
  const mhBudget = mh.budgets[which];
  const motorhome = {
    id: 'motorhome',
    name: mh.name,
    tagline: mh.tagline,
    summary: 'Transport and lodging in one vehicle, so there is nothing to book at every stop and you cook instead of eating out. On the Southwest Loop the catch was seven freezing nights; here there are none.',
    vehicle: {
      type: mh.vehicle.type,
      detail: `${mh.vehicle.example} · sleeps ${mh.vehicle.sleeps} · ${mh.vehicle.seatbelts} seatbelts · ${mh.vehicle.dimensions.length_ft} ft long, ${mh.vehicle.dimensions.width_ft.toFixed(2)} ft wide, ${mh.vehicle.dimensions.height_ft} ft high`,
      notes: mh.vehicle.notes
    },
    costs: {
      currency: mhBudget.currency,
      columns: [{ key: 'low', label: 'Low' }, { key: 'high', label: 'High' }],
      totals: { low: sumLines(mhBudget.lines, 'low'), high: sumLines(mhBudget.lines, 'high') },
      lines: mhBudget.lines.map((l) => ({ item: l.item, low: l.low, high: l.high, basis: l.basis })),
      notes: `Everything for six people for ${v.duration_days} days, flights included. The America the Beautiful pass is already owned, so national park entry is zero — but Anza-Borrego, the Salton Sea and Valley of Fire are state parks and charge separately.`
    },
    pros: mh.pros,
    cons: mh.cons,
    flags: shape.flags.motorhome
  };

  /* ---- car and lodging: "Everything else" is the remainder up to each quoted
     total, so both columns add up to the figure they are headed by ---- */
  const car = src.options['car-and-lodging'];
  const cb = car.budgets[which];
  const flights = mhBudget.lines.find((l) => l.item === 'Flights');
  const tram = mhBudget.lines.find((l) => l.item.includes('Tramway'));
  const parks = mhBudget.lines.find((l) => l.item.includes('State park'));
  const valueBuild = cb.builds.find((b) => b.id === 'value');
  const locBuild = cb.builds.find((b) => b.id === 'location');

  const carLines = [
    { item: 'Flights', value: flights.low, location: flights.high, basis: flights.basis },
    { item: 'Vehicle rental', value: cb.vehicle_low, location: cb.vehicle_high, basis: cb.vehicle_basis },
    { item: 'Fuel', value: cb.fuel.low, location: cb.fuel.high, basis: cb.fuel.basis },
    { item: 'Lodging', value: cb.lodging.value, location: cb.lodging.location, basis: cb.lodging.basis },
    { item: 'Food', value: cb.food.low, location: cb.food.high, basis: cb.food.basis },
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

  const carOption = {
    id: 'car-and-lodging',
    name: car.name,
    tagline: car.tagline,
    summary: 'A seven-seater and a room every night. It costs meaningfully more, and almost all of the gap is food and lodging — but on this route it buys comfort rather than warmth, because the motorhome is not cold here either.',
    vehicle: {
      type: car.vehicle.type,
      detail: `${car.vehicle.examples.join(' · ')} · ${car.vehicle.seats} seats`,
      notes: car.vehicle.notes
    },
    costs: {
      currency: 'USD',
      columns: [{ key: 'value', label: valueBuild.name }, { key: 'location', label: locBuild.name }],
      totals: { value: valueBuild.total, location: locBuild.total },
      lines: carLines,
      notes: '"Best value" goes midweek in Palm Springs and takes motels over rental houses. "Best location" puts you in the Coachella Valley proper and inside Borrego Springs rather than out at the edge.'
    },
    pros: car.pros,
    cons: car.cons,
    flags: shape.flags['car-and-lodging'],
    dayVia: Object.fromEntries(Object.entries(shape.carDetour).map(([d, keys]) => [d, keys.map(at)]))
  };

  return {
    id: v.id,
    name: v.title,
    subtitle: v.subtitle,
    summary: v.summary,
    hero: `${PHOTO}/${which === 'long' ? 'valley-of-fire.jpg' : 'galleta-meadows.jpg'}`,
    season: src.trip.season,
    startEnd: src.trip.start_end,
    totals: {
      days: v.duration_days,
      miles: v.total_miles,
      party: src.trip.party_size,
      avgMilesPerDay: v.avg_miles_per_day
    },
    mustSee: shape.mustSee.map(([name, day, photo, why]) => ({ name, day, photo: `${PHOTO}/${photo}`, why })),
    watchOuts: watchOutsFor(which),
    pros: shape.pros,
    cons: shape.cons,
    notConsidered: [...(v.rejected_extra || []), ...src.rejected_alternatives]
      .map((r) => ({ place: r.place, reason: r.reason })),
    moneySavers: src.money_savers.map((m) => ({ item: m.item, amount: m.saving || '', detail: m.detail })),
    options: [motorhome, carOption],
    days
  };
}

await mkdir(`${SITE}/data/routes`, { recursive: true });
const built = [];
for (const which of ['short', 'long']) {
  const route = buildVersion(which);
  await writeFile(`${SITE}/data/routes/${route.id}.json`, JSON.stringify(route, null, 2) + '\n');
  built.push(route);
}

/* Both routes into the manifest, next to each other, without disturbing the rest. */
const manifestPath = `${SITE}/data/manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8').catch(() => '{"routes":[]}'));
const want = built.map((r) => `routes/${r.id}.json`);
manifest.routes = manifest.routes.filter((r) => !want.includes(r));
const anchor = manifest.routes.indexOf('routes/southwest-loop.json');
manifest.routes.splice(anchor >= 0 ? anchor + 1 : manifest.routes.length, 0, ...want);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

/* ---- checks ---- */
let bad = 0;
for (const route of built) {
  route.options.forEach((opt) => {
    const c = opt.costs;
    c.columns.forEach((col) => {
      const s = sumLines(c.lines, col.key);
      if (s !== c.totals[col.key]) { bad++; console.log(`  !! ${route.id} ${opt.id} ${col.key}: ${s} vs ${c.totals[col.key]}`); }
    });
  });
  const drive = route.days.reduce((t, d) => t + (d.miles || 0), 0);
  const missing = route.days.flatMap((d) => (d.pois || []).filter((p) => !p.photos).map((p) => p.name));
  console.log(`${route.id.padEnd(18)} ${route.days.length} days · ${drive} transit mi · stated ${route.totals.miles} · ` +
    `${route.mustSee.length} must-see · ${route.watchOuts.length} watch-outs · ` +
    `${route.days.filter((d) => d.from.name === d.to.name).length} rest days`);
  console.log(`${''.padEnd(18)} no photo: ${missing.length ? missing.join(', ') : 'none'}`);
}
console.log('costs   :', bad ? `${bad} COLUMNS DO NOT ADD UP` : 'every column adds up');
