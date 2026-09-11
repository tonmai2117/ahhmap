# AahhMap — standalone map

Cloned from https://github.com/aahhtechlab-bit/AahhMap.git.

This app opens only `src/pages/Map.tsx`, at `/` and `/map`.
Other paths return to `/map`. The original map layout, shared components,
map icons, and portal behavior are retained.
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

Map tiles need internet access. For testing, GPS defaults to a fixed simulated
position in Bangkok (13.7466, 100.5285) with 10 m accuracy. The original player
marker, recenter control, distances, and portal proximity all use this position;
no device location permission is needed. This does not change the device GPS.

Open `/map?gps=real` to use the device's real location, then allow browser location
permission. Reload after changing this parameter. Real GPS retains the original
location error handling if it is unavailable.

## Theme and navigation

The map starts in Light mode and remembers a Light/Dark choice in local storage.
Navigation starts in walking mode and can be switched to driving. A destination
can be selected by clicking the map, choosing a portal, or using the Bangkok demo
fixture. Routes come from the public FOSSGIS walking and driving OSRM services and
therefore need internet access, have no availability guarantee, and may throttle
heavy traffic. No API key is stored in this project.

Open `/map?demo=1` for the complete local test flow. Choose **นำทางไป...**, select
**จุดทดสอบ A (กรุงเทพฯ)**, calculate the route, start navigation, and then start,
pause, or reset the roughly 30-second simulated walk. Open
`/map?demo=1&gps=real` to keep the demo destination while using device GPS; route
simulation is disabled in that mode.

CARTO supplies the Light and Dark map imagery. A CARTO key/API watermark can
appear on public tiles; it is part of that tile service and is intentionally not
hidden or altered here.

The active suite covers map routing, theme persistence, navigation,
GPS behavior, standalone data, OpenWeather integration, and the original bottom-sheet and
registration-query behavior.

## OpenWeather & Weather Cloud Animations

The map includes local weather information and SVG animated cloud markers near the player position.

- **API Key Configuration**: Put `OPENWEATHER_API_KEY=your_key_here` in `.env.local`. Never commit or expose this key to client bundles.
- **Local Dev & Preview**: Handled via Vite local server middleware (`/api/weather`) so the API key remains server-side only.
- **Vercel Serverless Function**: Production deployment on Vercel automatically uses `/api/weather.ts` as a Node serverless API function, securely reading `process.env.OPENWEATHER_API_KEY`.
- **Demo Fixtures**: Open `/map?demo=1` to test weather conditions (`clear`, `cloudy`, `light-rain`, `heavy-rain`, `thunderstorm`, `stale`, `error`) without issuing upstream API requests.

