# Southwest Loop — trip options

A small phone-first website for comparing how we do the January Southwest loop.
Pick an option, see the route on a map, scroll the fourteen days, tap the little
**Costs** button in the corner for the numbers.

**Live site:** https://taskotale.github.io/roadtrip/

Both options are the *same* 14-day route. What differs is what you sleep in, what
it costs, and which three places the motorhome is not allowed to go.

No build step, no framework — plain HTML, CSS and one JavaScript file.

---

## Editing the trip

Everything the site shows comes from three files:

| File | What it holds |
| --- | --- |
| `data/manifest.json` | The trip title, the stats on the home screen, and which option files to load |
| `data/options/motorhome.json` | The motorhome option |
| `data/options/car-and-lodging.json` | The car-and-hotels option |

To change a number, a day's write-up, or a cost line, edit the option file and push:

```bash
git add -A && git commit -m "Update costs" && git push
```

GitHub rebuilds the site in about a minute.

> **If you edit `index.html`, `css/style.css` or `js/app.js`,** bump the `?v=`
> number on the `style.css` and `app.js` links in `index.html`. Phones cache hard
> and that is what makes them pick up the new version.

---

## Adding a third option

1. Copy an existing option file to `data/options/<new-id>.json` and edit it.
2. Add its filename to the `options` list in `data/manifest.json`.
3. Push.

The home screen picks it up automatically. Options can share photos — both current
options point at the same `assets/photos/southwest-loop/` folder.

### What goes in an option file

```jsonc
{
  "id": "motorhome",                    // must match the filename
  "name": "Motorhome",                  // shown on the home card
  "tagline": "Cheapest, simplest, coldest",
  "summary": "A sentence or two on the trade-off.",

  "vehicle": {
    "type": "Class C motorhome, 30 ft",
    "detail": "Sleeps 7 · 7 seatbelts · 30 ft long",
    "notes": "Longer caveat text."
  },

  "totals": { "days": 14, "miles": 1655, "party": 6 },

  "costs": {
    "currency": "USD",
    "party": 6,
    // One column per scenario you want to compare side by side.
    "columns":   [{ "key": "low", "label": "Low" }, { "key": "high", "label": "High" }],
    "totals":    { "low": 7127, "high": 7922 },
    "perPerson": { "low": 1188, "high": 1320 },
    "lines": [
      { "item": "Flights", "low": 2280, "high": 2280, "basis": "6 people x $380 round trip" }
    ],
    "notes": "What the numbers assume."
  },

  "pros": ["..."],
  "cons": ["..."],

  "days": [
    {
      "day": 1,
      "from": { "name": "Las Vegas, NV",   "coords": [36.1699, -115.1398] },
      "to":   { "name": "Furnace Creek",   "coords": [36.4636, -116.8656] },
      "miles": 120,
      "driveTime": "2h",
      "elevation": -190,
      "freezingNight": false,
      "headline": "Below sea level by lunchtime",
      "notes": "The paragraph shown when the day is expanded.",
      "activities": ["Zabriskie Point at sunset"],
      "flags": [
        { "type": "blocked", "label": "Not in the motorhome:", "text": "..." }
      ],
      "pois": [
        {
          "name": "Zabriskie Point",
          "coords": [36.4200, -116.8117],
          "photo": "assets/photos/southwest-loop/zabriskie-point.jpg",
          "caption": "One line about it."
        }
      ],
      "route": [[36.1699, -115.1398], [36.4636, -116.8656]]
    }
  ]
}
```

Notes on the shape:

- **`coords` are `[latitude, longitude]`** — latitude first, the way Leaflet wants them.
- **`columns`** drives the costs table. Two columns renders two price columns side by
  side; one column renders a single price. The keys in `columns` must match the keys
  used in `totals`, `perPerson` and every `lines` entry.
- **`flags`** are the per-option annotations — `blocked` renders red, `unlocked` green,
  `note` grey. This is how the site shows that the RV cannot drive Mount Carmel
  Highway while the car can.
- A day where `miles` is `0`, or where `from` and `to` match, renders as
  "Based in …" with no arrow.
- **`route`** is optional. Without it the map draws a dashed straight line.
- `note`, `caption`, `flags`, `activities` and `elevation` are all optional.

---

## Photos

Photos live in `assets/photos/southwest-loop/`. To swap one you don't like,
overwrite the file with the same name — nothing else changes. If a photo is missing
the site shows a grey placeholder rather than breaking.

Keep them at most 1200px wide and under ~320KB so they load quickly on a phone
in a park with one bar:

```bash
sips -Z 1200 -s format jpeg -s formatOptions 60 ~/Downloads/new.jpg --out "assets/photos/southwest-loop/zabriskie-point.jpg"
```

Sources and licences for every current photo are in [CREDITS.md](CREDITS.md).
There are a few spare photos in the folder that no day currently points at —
`mosaic-canyon`, and any others you add — ready to drop into a `pois` entry.

---

## Drawing the real roads

Each day carries a `route`: the list of coordinates the map draws. To fetch real
road geometry and bake it into a file:

```bash
node tools/build-routes.mjs data/options/motorhome.json
```

It asks a free routing server for each day's driving route, threading through that
day's points of interest, and writes the result back into the JSON. Run it once per
option file, and re-run with `--force` if you change the stops. The site itself never
calls the routing server, so the map keeps working on a bad connection.

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
| `index.html` | The whole page — home list and option detail |
| `css/style.css` | All the styling |
| `js/app.js` | Routing, rendering, map and costs logic |
| `data/` | The trip content |
| `assets/photos/southwest-loop/` | Photos, shared by both options |
| `tools/build-routes.mjs` | One-time road geometry fetcher |
| `source/` | The original data file this was built from |

The map uses [Leaflet](https://leafletjs.com) with
[OpenStreetMap](https://www.openstreetmap.org/copyright) tiles — free, no account
or API key needed.
