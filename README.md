# Road trip routes

A small phone-first website for planning family road trips.

**Live site:** https://taskotale.github.io/roadtrip/

The home screen lists **routes**. Open one and you get the map, the **options**
— the different ways of doing that same route — what's worth seeing, the
day-by-day plan, and what to watch out for. Each route has its own options, so a
future route can be "campervan vs. hotels" or "10 days vs. 14 days" or anything
else.

Route page order: summary → how we do it → must see → why this route → places we
left out → day by day → watch out for → costs.

```
Route  ──  Southwest Loop — January        the original: five national parks, a cold middle
        ──  Low Desert Loop, the short way  10 days: Death Valley, Route 66, Joshua Tree
        ──  Low Desert Loop, the long way   14 days: the same, finishing at Valley of Fire
        ──  Sonoran Loop — January          warmest of them, and the most driving
        ──  Key West Run — January          the East Coast rival: drive from home, no flights
        ──  New Orleans Loop — January      inland to New Orleans, home along the Gulf
             ├── shared: the map, the days, must-sees, watch-outs, pros/cons
             └── options: Motorhome  ·  Car and lodging
                          (cost, vehicle, and which days change)
```

All four Southwest routes start and end at Las Vegas, are priced for six people in January,
and open in Death Valley. After that they go different ways. The two Low Desert routes are the
same trip at two lengths — one source file and one builder produce both, and they share a photo
folder, so a picture swapped for one is swapped for both.

Two routes leave from Fort Lee, NJ instead, driven from home with no flights and no airport.
The **Key West Run** goes down the Atlantic coast to the bottom of the Florida Keys and back
up the same way. The **New Orleans Loop** is a loop rather than an out-and-back: down the
inland side of the Appalachians through Nashville, Memphis and the Delta, then home along the
Gulf coast and up the Piedmont, so no road is driven twice. Both split their options on the
vehicle — a hired van against a motorhome — rather than on where you sleep.

Costs are deliberately tucked away — no prices on the home screen, and none on the
route page until you reach the summary at the very bottom. The **COSTS** button
there opens a separate page with both options broken down side by side, with a
"Go back" button at the top and bottom.

No build step, no framework — plain HTML, CSS and one JavaScript file.

---

## Editing

Everything the site shows comes from two files:

| File | What it holds |
| --- | --- |
| `data/manifest.json` | Which route files to load |
| `data/routes/southwest-loop.json` | One whole route: days, must-sees, watch-outs, options |
| `data/routes/low-desert-short.json` | The warm loop through the Mojave and the Colorado Desert, in ten days |
| `data/routes/low-desert-loop.json` | The same loop in fourteen, finishing at Valley of Fire |
| `data/routes/sonoran-loop.json` | The Arizona loop, out to Saguaro and Tucson |
| `data/routes/key-west-run.json` | Fort Lee to Key West and back, driven from home |
| `data/routes/new-orleans-loop.json` | Fort Lee to New Orleans and back the other way, a loop |

Change a number or some wording, then push:

```bash
git add -A && git commit -m "Update the Zion day" && git push
```

GitHub rebuilds in about a minute.

> **If you edit `index.html`, `css/style.css` or `js/app.js`,** bump the `?v=`
> number on the `style.css` and `app.js` links in `index.html`. Phones cache hard
> and that is what makes them pick up the new version.

---

## Adding a new route

Either hand-write the JSON against the schema below — perfectly fine for a one-off
— or copy one of the builders in `tools/` and generate it. Each builder is the
record of how those route files were produced; running one plus `tools/build-routes.mjs`
reproduces its output exactly. `build-sonoran-loop.mjs` is the simplest template for a
single route; `build-low-desert.mjs` shows how to emit two versions of one trip from a
single source file, which is what keeps their shared wording from drifting apart.

A builder adds itself to `data/manifest.json` without disturbing the routes already
listed, so rebuilding one route never drops the others off the home screen.

1. Copy `data/routes/southwest-loop.json` to `data/routes/<new-id>.json` and edit it.
2. Add its filename to `data/manifest.json`:
   ```json
   { "routes": ["routes/southwest-loop.json", "routes/<new-id>.json"] }
   ```
3. Put its photos in `assets/photos/<new-id>/` and point the `photo` paths at them.
4. Bake the road geometry (below), then push.

---

## What goes in a route file

```jsonc
{
  "id": "southwest-loop",              // must match the filename
  "name": "Southwest Loop — January",
  "subtitle": "Death Valley · Zion · Page · …",
  "summary": "A paragraph on what this route is.",
  "hero": "assets/photos/southwest-loop/monument-valley-mittens.jpg",
  "season": "January",
  "startEnd": "Las Vegas, NV",
  "totals": { "days": 14, "miles": 1655, "party": 6, "avgMilesPerDay": 118 },

  // Photo rail near the top. Tapping one jumps to that day.
  "mustSee": [
    { "name": "Zabriskie Point", "day": 1,
      "photo": "assets/photos/southwest-loop/zabriskie-point.jpg",
      "why": "Why it earns a stop." }
  ],

  // Things that bite you if nobody reads them.
  // "only" limits one to a single option; leave it out to show it for all.
  "watchOuts": [
    { "title": "Seven nights below freezing", "text": "…" },
    { "title": "Freeze damage is charged to you", "text": "…", "only": "motorhome" }
  ],

  "pros": ["What makes this route good."],
  "cons": ["The catch."],
  "notConsidered": [{ "place": "Bryce Canyon", "reason": "8,000 ft, miserable in January." }],
  "moneySavers": [{ "item": "Skip Antelope Canyon", "amount": "~$480", "detail": "…" }],

  // The ways of doing this route. Each gets its own tab.
  "options": [
    {
      "id": "motorhome",
      "name": "Motorhome",
      "tagline": "Cheapest, simplest, coldest",
      "summary": "…",
      "vehicle": { "type": "Class C motorhome, 30 ft", "detail": "…", "notes": "…" },
      "pros": ["…"],
      "cons": ["…"],

      "costs": {
        "currency": "USD",
        // One column per scenario to compare side by side.
        "columns": [{ "key": "low", "label": "Low" }, { "key": "high", "label": "High" }],
        "totals":  { "low": 7128, "high": 7923 },
        "lines": [
          { "item": "Flights", "low": 2280, "high": 2280, "basis": "6 people x $380 round trip" }
        ],
        "notes": "What the numbers assume."
      },

      // Notes attached to individual days, only for this option.
      // "blocked" renders red, "unlocked" green, "note" grey.
      "flags": {
        "6": [{ "type": "blocked", "label": "Not in the motorhome:", "text": "…" }]
      },

      // Force this option down a different road on one day (the RV cannot use
      // the Zion tunnel). build-routes.mjs turns this into "dayRoutes".
      "dayVia": { "7": [[37.1753, -113.2899], [36.9903, -112.9769]] }
    }
  ],

  // The itinerary, shared by every option.
  "days": [
    {
      "day": 1,
      "from": { "name": "Las Vegas, NV", "coords": [36.1674, -115.1484] },
      "to":   { "name": "Furnace Creek", "coords": [36.4565, -116.8691] },
      "miles": 120,
      "driveTime": "2h",
      "elevation": -190,
      "freezingNight": false,
      "headline": "Below sea level by lunchtime",
      "notes": "The paragraph shown when the day is expanded.",
      "activities": ["Zabriskie Point at sunset"],
      "pois": [
        {
          "name": "Zabriskie Point",
          "coords": [36.42, -116.8123],
          "caption": "One line about it.",
          // Tapping the thumbnail opens all of these in a full-screen viewer.
          "photos": [
            { "src": "assets/photos/southwest-loop/zabriskie-point.jpg",
              "caption": "One line about it." },
            { "src": "assets/photos/southwest-loop/zabriskie-point-2.jpg" },
            { "src": "assets/photos/southwest-loop/zabriskie-point-3.jpg" }
          ]
        }
      ],
      "route": [[36.1674, -115.1484], [36.4565, -116.8691]]
    }
  ]
}
```

Things worth knowing:

- **`coords` are `[latitude, longitude]`** — latitude first, the way Leaflet wants them.
- Each point of interest's first photo shows as a strip on the closed day card, so
  the pictures are visible without tapping anything. Tapping anywhere on a closed
  card opens it; tapping a photo inside an open card opens the full-screen viewer,
  which swipes and arrows through every photo on that day.
- A `pois` entry may use a single `"photo": "..."` string instead of `photos`;
  both work.
- A day where `from` and `to` match renders as "Based in …" with no map leg.
- `columns` keys must match the keys used in `totals` and every `lines` entry.
  **Each column should add up to its total** — the site shows the sum and people
  notice when it doesn't.
- **Totals only, never a per-person figure.** The kids are not paying, and one
  person dropping out would barely move the number, so a per-head split would
  mislead more than it helps.
- **`route` is optional.** Without it the map draws a dashed straight line.
- Optional throughout: `note`, `caption`, `flags`, `activities`, `elevation`,
  `hero`, `notConsidered`, `moneySavers`, `only`.

---

## Photos

Photos live in `assets/photos/<route-id>/`. To swap one you don't like, overwrite
the file with the same name — nothing else changes. A missing photo shows a grey
placeholder rather than breaking the page, which is how `Font's Point` renders: no
verified free photo of it exists, and a stand-in captioned as the landmark would be
worse than a blank.

The two Low Desert routes are the exception to one-folder-per-route: they are the same
trip at two lengths, so both read from `assets/photos/low-desert-loop/`.

**Extra photos are picked up by filename.** A point of interest that uses
`zabriskie-point.jpg` automatically gains `zabriskie-point-2.jpg`,
`-3.jpg`, `-4.jpg` and so on — drop the file in, rebuild the route, and it appears
in the viewer. The numbering must be unbroken.

Keep them at most 1200px wide and under ~180KB so they load quickly on a phone in
a park with one bar:

```bash
sips -Z 1200 -s format jpeg -s formatOptions 55 ~/Downloads/new.jpg --out "assets/photos/southwest-loop/zabriskie-point-5.jpg"
```

Check the result is actually under 180KB — `sips` quietly ignores the quality setting
on some files. When it does, use ImageMagick and step the size down as well:

```bash
magick in.jpg -resize '1000x1000>' -strip -quality 50 out.jpg
```

To find candidates in the first place:

```bash
node tools/fetch-commons.mjs /tmp/candidates skull-rock "cat:Category:Skull Rock" 8
```

That pulls up to eight freely-licensed photos off Wikimedia Commons into
`/tmp/candidates/skull-rock/`, with a `meta.json` holding the author, licence and
source page for each — the four columns `CREDITS.md` needs. A `cat:` prefix lists a
Commons category; anything else is a free-text search. **Look at every photo before
you use one.** Searches return decoys, aerials where the landmark is unrecognisable,
and shots through car windows, and a category can be full of something else entirely
— the Wickenburg category is mostly turkey vultures.

Sources and licences for every photo are in [CREDITS.md](CREDITS.md). A couple of
spares sit in the folder unused (`mosaic-canyon`, `elephant-rock`-style extras),
ready to drop into a `pois` entry.

---

## Drawing the real roads

```bash
node tools/build-routes.mjs data/routes/southwest-loop.json
```

It asks a free routing server for each day's driving route and writes the geometry
back into the file. It also handles any option's `dayVia` detour, storing the
result in that option's `dayRoutes`. Run it once per route file; add `--force` to
redo geometry that already exists. The site never calls the routing server itself,
so the map keeps working on a bad connection.

---

## Working on it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly as a file will not
work — the browser blocks loading the JSON that way.

---

## What's where

| Path | What it is |
| --- | --- |
| `index.html` | The whole page — routes list and route detail |
| `css/style.css` | All the styling |
| `js/app.js` | Routing, rendering, map and costs logic |
| `data/routes/*.json` | One file per route |
| `assets/photos/<route-id>/` | Photos for that route |
| `tools/build-routes.mjs` | One-time road geometry fetcher (any route) |
| `tools/build-southwest-loop.mjs` | Rebuilds that one route from `source/` — a worked example |
| `tools/build-low-desert.mjs` | Builds both Low Desert routes from one source file |
| `tools/build-sonoran-loop.mjs` | Same, for the Sonoran Loop |
| `tools/build-key-west-run.mjs` | Same, for the Key West Run |
| `tools/build-new-orleans-loop.mjs` | Same, for the New Orleans Loop |
| `tools/fetch-commons.mjs` | Pulls freely-licensed candidate photos off Wikimedia Commons |
| `source/` | The planning data and checked coordinates each route was built from |

The map uses [Leaflet](https://leafletjs.com) with
[OpenStreetMap](https://www.openstreetmap.org/copyright) tiles — free, no account
or API key needed.
