import type { Treasure, TreasureTier } from '../types'

export type MapPosition = { lat: number; lng: number; accuracy: number }
export type MapMode = 'daily' | 'event'

export const TIER_COLORS: Record<TreasureTier, string> = {
  common: '#19bfa1',
  rare: '#ef5128',
  epic: '#8556e3',
  legendary: '#8556e3',
}

export const TIER_LABELS: Record<TreasureTier, string> = {
  common: 'ทั่วไป',
  rare: 'พิเศษ',
  epic: 'อีเวนต์',
  legendary: 'อีเวนต์',
}

export const EVENT_COLORS = ['#ef5128', '#19bfa1', '#8556e3']

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getTier(t: Treasure): TreasureTier {
  return t.tier === 'common' || t.tier === 'rare' || t.tier === 'epic' ? t.tier : 'rare'
}

export function orderByNearestNeighbor(treasures: Treasure[], pos: MapPosition) {
  const remaining = [...treasures]
  const ordered: Treasure[] = []
  let current = { lat: pos.lat, lng: pos.lng }

  while (remaining.length) {
    remaining.sort(
      (a, b) =>
        haversine(current.lat, current.lng, a.lat, a.lng) -
        haversine(current.lat, current.lng, b.lat, b.lng),
    )
    const [next] = remaining.splice(0, 1)
    ordered.push(next)
    current = { lat: next.lat, lng: next.lng }
  }

  return ordered
}
