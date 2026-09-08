# AahhMap — standalone map

Cloned from https://github.com/aahhtechlab-bit/AahhMap.git.

This app opens only the original `src/pages/Map.tsx`, at `/` and `/map`.
Other paths return to `/map`. The map page, shared components, map icons,
stylesheets, map tiles, default coordinates, and layout are unchanged.
The original other pages remain in the checkout but are not imported by the
standalone entry point or included in its build/test scope.

## Run

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Data and services

The supplied repository contains no backend, portal dataset, LIFF module,
external-game module, or AR bridge. The standalone app therefore opens without
a LINE sign-in or friendship gate. It uses the original guest profile, unknown
coin balance (`—`), and an empty portal list. No rewards or accounts are created.

`src/data/map.json` is the data adapter's local source. Its empty list is
intentional; connect verified portal data and a backend if needed. AR gameplay
and reward collection are not part of this map-only app.

Map tiles need internet access. Browser location permission enables the original
position marker and recenter control. If location is unavailable, the map stays
at the original Bangkok coordinates and retains its original location message.

The original LINE/AR/page tests are retained but excluded from the standalone
test suite. The active suite covers map routing, standalone data, and the original
bottom-sheet and registration-query behavior.