import { haversine, type MapPosition } from './mapDomain'

export type TravelMode = 'walking' | 'driving'
export type MapTheme = 'light' | 'dark'

export type Destination = {
  id: string
  name: string
  lat: number
  lng: number
  source: 'map' | 'portal' | 'demo'
}

export type RouteStep = {
  id: string
  instruction: string
  distanceM: number
  durationS: number
  geometry: [number, number][]
  maneuver: {
    type: string
    modifier?: string
    exit?: number
    location: [number, number]
  }
}

export type RouteResult = {
  mode: TravelMode
  geometry: [number, number][]
  distanceM: number
  durationS: number
  steps: RouteStep[]
  snappedDestinationDistanceM: number
}

export type NavigationPhase = 'idle' | 'selecting' | 'preview' | 'navigating' | 'arrived'
export type FetchStatus = 'idle' | 'loading' | 'ready' | 'error'
export type SimulationStatus = 'idle' | 'running' | 'paused'

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} ม.`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} กม.`
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} นาที`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ชม. ${rest} นาที` : `${hours} ชม.`
}

export function thaiInstruction(
  maneuver: { type?: string; modifier?: string; exit?: number },
  roadName?: string,
) {
  const road = roadName?.trim() ? ` เข้าสู่ ${roadName.trim()}` : ''
  const modifier = maneuver.modifier ?? ''
  const turn = modifier.includes('left')
    ? modifier.includes('slight') ? 'เบี่ยงซ้าย' : modifier.includes('sharp') ? 'เลี้ยวซ้ายหักศอก' : 'เลี้ยวซ้าย'
    : modifier.includes('right')
      ? modifier.includes('slight') ? 'เบี่ยงขวา' : modifier.includes('sharp') ? 'เลี้ยวขวาหักศอก' : 'เลี้ยวขวา'
      : modifier === 'uturn' ? 'กลับรถ' : 'ตรงต่อไป'

  switch (maneuver.type) {
    case 'depart': return `เริ่มเดินทาง${road}`
    case 'arrive': return 'ถึงปลายทางแล้ว'
    case 'roundabout':
    case 'rotary': return maneuver.exit ? `ใช้วงเวียน ทางออกที่ ${maneuver.exit}${road}` : `ใช้วงเวียน${road}`
    case 'merge': return `รวมเข้าสู่เส้นทาง${road}`
    case 'fork': return `${turn}${road}`
    case 'on ramp': return `เข้าสู่ทางเชื่อม${road}`
    case 'off ramp': return `ออกจากทางหลัก${road}`
    case 'end of road': return `${turn}${road}`
    case 'turn':
    case 'continue':
    case 'new name': return `${turn}${road}`
    default: return `เดินทางต่อ${road}`
  }
}

function cumulativeLengths(geometry: [number, number][]) {
  const values = [0]
  for (let i = 1; i < geometry.length; i += 1) {
    const [prevLng, prevLat] = geometry[i - 1]
    const [lng, lat] = geometry[i]
    values.push(values[i - 1] + haversine(prevLat, prevLng, lat, lng))
  }
  return values
}

export function pointAlongRoute(geometry: [number, number][], distanceM: number): MapPosition | null {
  if (!geometry.length) return null
  const lengths = cumulativeLengths(geometry)
  const target = Math.max(0, Math.min(distanceM, lengths[lengths.length - 1]))
  let index = lengths.findIndex((value) => value >= target)
  if (index < 1) index = Math.min(1, geometry.length - 1)
  const startDistance = lengths[index - 1] ?? 0
  const segmentDistance = Math.max(1, (lengths[index] ?? startDistance) - startDistance)
  const ratio = (target - startDistance) / segmentDistance
  const [startLng, startLat] = geometry[index - 1] ?? geometry[0]
  const [endLng, endLat] = geometry[index] ?? geometry[geometry.length - 1]
  return {
    lat: startLat + (endLat - startLat) * ratio,
    lng: startLng + (endLng - startLng) * ratio,
    accuracy: 10,
  }
}

export function routeProgress(geometry: [number, number][], position: MapPosition) {
  if (geometry.length < 2) return { traveledM: 0, remainingM: 0, ratio: 0 }
  const lengths = cumulativeLengths(geometry)
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(position.lat * Math.PI / 180)
  let bestTraveled = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let i = 1; i < geometry.length; i += 1) {
    const [startLng, startLat] = geometry[i - 1]
    const [endLng, endLat] = geometry[i]
    const ax = (startLng - position.lng) * metersPerDegreeLng
    const ay = (startLat - position.lat) * metersPerDegreeLat
    const bx = (endLng - position.lng) * metersPerDegreeLng
    const by = (endLat - position.lat) * metersPerDegreeLat
    const dx = bx - ax
    const dy = by - ay
    const denominator = dx * dx + dy * dy
    const segmentRatio = denominator ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator)) : 0
    const px = ax + dx * segmentRatio
    const py = ay + dy * segmentRatio
    const distance = Math.hypot(px, py)
    if (distance < bestDistance) {
      bestDistance = distance
      bestTraveled = lengths[i - 1] + (lengths[i] - lengths[i - 1]) * segmentRatio
    }
  }
  const total = lengths[lengths.length - 1]
  const traveledM = bestTraveled
  return { traveledM, remainingM: Math.max(0, total - traveledM), ratio: total ? traveledM / total : 0 }
}
