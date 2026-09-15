import maplibregl, { type CameraOptions, type FlyToOptions, type Map as MapLibreMap } from 'maplibre-gl'
import { FacadeLayer } from './FacadeLayer'
import { type Artwork } from './artData'
import { offsetLngLat, wallLayout, type FacadePlacement } from './facadeGeometry'

export const SONG_WAT: [number, number] = [100.509, 13.7372]
export const OVERVIEW = { center: SONG_WAT, zoom: 16.25, pitch: 52, bearing: -28, elevation: 0 }

export function createArtScene(container: HTMLDivElement, options: { overview?: boolean; onReady?: (map: MapLibreMap) => void; onError?: (message: string) => void }, artworks: Artwork[]) {
  const map = new maplibregl.Map({ container, style: 'https://tiles.openfreemap.org/styles/liberty', ...(options.overview ? OVERVIEW : { center: [100.5232, 13.747] as [number, number], zoom: 10.8, pitch: 18, bearing: -8 }), maxPitch: 85, maxZoom: 23, canvasContextAttributes: { antialias: true }, attributionControl: { compact: true } })
  map.setCenterClampedToGround(false)
  map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
  const facades = new FacadeLayer(artworks, options.onError)
  map.on('load', () => {
    const style = map.getStyle()
    for (const layer of style.layers) {
      const water = /water|ocean/.test(layer.id)
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#17191b')
      if (layer.type === 'fill') map.setPaintProperty(layer.id, 'fill-color', water ? '#152d32' : /building/.test(layer.id) ? '#41312c' : '#292526')
      if (layer.type === 'line') map.setPaintProperty(layer.id, 'line-color', water ? '#24454b' : /path|pedestrian/.test(layer.id) ? '#925247' : '#5a3e37')
      if (layer.type === 'symbol') {
        if (layer.layout?.['text-field']) {
          map.setPaintProperty(layer.id, 'text-color', '#aaa19b')
          map.setPaintProperty(layer.id, 'text-halo-color', '#242123')
        }
        map.setPaintProperty(layer.id, 'icon-opacity', 0.45)
      }
    }
    const source = Object.keys(style.sources).find((id) => style.sources[id].type === 'vector')
    if (source) map.addLayer({ id: 'linemap-3d-buildings', type: 'fill-extrusion', source, 'source-layer': 'building', minzoom: 13, paint: { 'fill-extrusion-color': '#73544a', 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } })
    map.addLayer(facades)
    options.onReady?.(map)
  })
  return { map, facades }
}

export function facadeCamera(map: MapLibreMap, placement: FacadePlacement): CameraOptions {
  const wall = wallLayout(placement)
  const distance = Math.max(placement.cameraDistance, wall.height * 1.4, 6)
  const from = offsetLngLat(wall.center, wall.normal[0] * distance, wall.normal[1] * distance)
  const elevation = wall.bottom + wall.height / 2
  return map.calculateCameraOptionsFromTo(new maplibregl.LngLat(...from), elevation + distance * 0.27, new maplibregl.LngLat(...wall.center), elevation)
}

/** MapLibre 5 flyTo does not interpolate elevation. Apply it through the public camera hook. */
export function flyArtCamera(map: MapLibreMap, options: FlyToOptions) {
  map.stop()
  const start = map.getCenterElevation(), end = options.elevation ?? start
  let progress = 0
  const previous = map.transformCameraUpdate
  map.transformCameraUpdate = (transform) => ({ ...previous?.(transform), elevation: start + (end - start) * progress })
  const clean = () => { map.transformCameraUpdate = previous; map.off('moveend', clean) }
  map.once('moveend', clean)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion || options.duration === 0) {
    progress = 1
    const padding = typeof options.padding === 'number' ? { top: options.padding, bottom: options.padding, left: options.padding, right: options.padding } : options.padding
    map.jumpTo({ ...options, padding })
  } else {
    map.flyTo({ ...options, easing: (t) => { progress = t * t * (3 - 2 * t); return progress } })
  }
}
