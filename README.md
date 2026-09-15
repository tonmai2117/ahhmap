# Bangkok Art Map

Bangkok Art Map is an exhibition-style 3D map of street art in Bangkok. The current
handoff branch is [`bangkok-art-map`](https://github.com/tonmai2117/ahhmap/tree/bangkok-art-map).
The public experience is available at `/` or `/art-map`; the content workspace is at
`/admin`.

## Handoff quick start

```sh
git clone -b bangkok-art-map https://github.com/tonmai2117/ahhmap.git
cd ahhmap
npm ci
npm run dev
```

Then open `http://localhost:5173/`. The first screen is the Bangkok Art Map; open
`http://localhost:5173/admin` to add or edit artwork records.

Before opening a pull request, run:

```sh
npm test -- --run src/standalone/facadeGeometry.test.ts
npm run typecheck
npm run build
```

The production Site is [aahhmap-map.pannawat2117.chatgpt.site](https://aahhmap-map.pannawat2117.chatgpt.site/).
The `/admin` page currently stores records in this browser's local storage; it is a
working demo adapter, not a shared CMS. Replace the adapter in `src/artMap/artData.ts`
when connecting a shared database and object storage.

## What the 3D facade feature does

Clicking a published artwork marker flies the camera into the Song Wat area and then
shows the artwork image as a real vertical mesh in the MapLibre 3D scene. The mesh
uses the same WebGL depth buffer as the building extrusions, so it stays fixed to the
building when the camera rotates and can be occluded by geometry. The image is not a
screen-facing HTML overlay.

The two reference murals are seeded in `src/artMap/artData.ts`:

- `songwat-elephant` — the elephant mural
- `songwat-woman` — the woman, flower, and butterfly mural

The placement values are starter calibration from the supplied photos. They should be
refined against current Street View or field measurements before treating the facade
as survey-accurate; OpenFreeMap building footprints and heights are approximate.

## Adding an artwork and attaching it to a wall

1. Open `/admin` and complete the title, artist, location, and artwork image.
2. Enable **ติดภาพเข้ากับผนังอาคาร** for a graffiti/mural.
3. Enter the wall start/end longitude and latitude, the outward wall bearing
   (0° = north, 90° = east), and the artwork width, height, and bottom offset in metres.
4. Set `ตำแหน่งตามแนวผนัง` from `0` to `1` and choose a camera approach distance.
5. Choose **เผยแพร่**, save, and reload the map. The map's artwork switcher can be used
   to fly directly to the new work.

The optional `crop` field in `FacadePlacement` maps four normalized source-photo
 corners (top-left, top-right, bottom-right, bottom-left) onto the wall. Use it when
 the source photo includes surrounding architecture or was taken at an angle. New
 records without a crop use the complete source image.

## Code map

| File | Responsibility |
| --- | --- |
| `src/pages/ArtMap.tsx` | Public map flow, intro, marker selection, camera flight, detail/photo dialog |
| `src/pages/Admin.tsx` | Local demo content editor and physical facade fields |
| `src/artMap/artData.ts` | Artwork type, seed records, local-storage adapter and defaults |
| `src/artMap/mapScene.ts` | MapLibre style, 3D building layer and facade camera calculation |
| `src/artMap/FacadeLayer.ts` | Three.js custom layer; depth-tested facade meshes and image textures |
| `src/artMap/facadeGeometry.ts` | Meter-based wall layout, photo homography, validation |
| `src/artMap/artMap.css` | Public map layout, focused detail panel, responsive controls |
| `src/artMap/admin.css` | Admin form and collection styling |
| `src/standalone/facadeGeometry.test.ts` | Facade corner mapping and validation regression tests |
| `public/artworks/` | Seed mural photos used by the demo records |

## Working notes for maintainers

- Keep `FacadeLayer` after the `linemap-3d-buildings` layer. Its shared depth buffer is
  what makes the wall relationship visible when orbiting.
- Facade dimensions are metres, not screen pixels. Do not reintroduce the old pixel
  offset overlay fields for new work.
- `wallStart` and `wallEnd` must describe the same physical wall edge. `outwardBearing`
  points from that wall toward the viewer-facing side.
- Keep image uploads at or below 4 MB in the demo admin. A production adapter should
  move these blobs to object storage instead of local storage.
- Map tiles require internet access. The current basemap is OpenFreeMap Liberty with
  a restrained CI palette; replace it with a licensed provider for production SLAs.

## Git and deployment handoff

The GitHub handoff branch is `bangkok-art-map`; keep feature work there unless the team
agrees on a new branch. The repository also has a Sites remote used by the published
version. `.openai/hosting.json` must keep the existing `project_id` and `static.directory`
when publishing through Sites. Build `dist/` from the exact commit being released and
deploy that version; do not package a different working tree than the pushed commit.

For a normal dev handoff, the GitHub clone and `npm run dev` steps above are sufficient.
For a production release, run the validated build, push the commit, then use the
workspace's Sites publishing flow so the public URL remains unchanged.

The demo admin uses browser-local storage so the full upload → pin → publish flow can
be tried immediately without credentials. The `src/artMap/artData.ts` adapter is the
boundary for connecting Supabase Storage/Postgres (or another production backend).

The map uses MapLibre GL with OpenFreeMap vector tiles and a restrained 3D building
layer. Bangkok coverage depends on the source tile data; replace the style URL with a
licensed provider when production imagery or higher-detail 3D tiles are required.

During a focused artwork view, the map markers recede so the calibrated facade image
is the visual focus while the detail panel is open.

Selecting a published artwork flies the camera to its configured viewing position,
then renders its photograph as a depth-tested vertical mesh on the building facade
before opening the detail panel. The two Song Wat murals include calibrated starter
values in `src/artMap/artData.ts`; new works can enable **ติดภาพเข้ากับผนังอาคาร** in
`/admin` and tune wall endpoints, outward bearing, dimensions, height, and approach
distance in metres. The supplied values are visual starter calibration from the
reference photos, not a survey-grade building model; refine them against current
Street View or field measurements for production accuracy.

## Existing AahhMap — standalone map

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
