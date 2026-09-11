import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRoute, routeUrl, ROUTING_ENDPOINTS } from '../map/routingClient'

afterEach(() => vi.unstubAllGlobals())

describe('routing client', () => {
  it('uses lng,lat and separate walking/driving endpoints', () => {
    const points = [{ lat: 13.7466, lng: 100.5285 }, { lat: 13.746, lng: 100.5303 }]
    expect(routeUrl(points, 'walking')).toContain(`${ROUTING_ENDPOINTS.walking}/100.5285,13.7466;100.5303,13.746`)
    expect(routeUrl(points, 'driving')).toContain(ROUTING_ENDPOINTS.driving)
    expect(routeUrl(points, 'walking')).toContain('steps=true')
  })

  it('normalizes geometry, totals and Thai instructions from OSRM', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      code: 'Ok',
      waypoints: [{ distance: 2 }, { distance: 4 }],
      routes: [{
        distance: 218.9,
        duration: 175.2,
        geometry: { type: 'LineString', coordinates: [[100.5285, 13.7466], [100.5303, 13.746]] },
        legs: [{ steps: [
          { name: 'ถนนทดสอบ', distance: 200, duration: 150, geometry: { type: 'LineString', coordinates: [[100.5285, 13.7466], [100.5301, 13.7461]] }, maneuver: { type: 'depart', location: [100.5285, 13.7466] } },
          { name: '', distance: 18.9, duration: 25.2, geometry: { type: 'LineString', coordinates: [[100.5301, 13.7461], [100.5303, 13.746]] }, maneuver: { type: 'arrive', location: [100.5303, 13.746] } },
        ] }],
      }],
    }), { status: 200 })))
    const result = await fetchRoute([{ lat: 13.7466, lng: 100.5285 }, { lat: 13.746, lng: 100.5303 }], 'walking')
    expect(result.mode).toBe('walking')
    expect(result.distanceM).toBe(218.9)
    expect(result.steps.map((step) => step.instruction)).toEqual(['เริ่มเดินทาง เข้าสู่ ถนนทดสอบ', 'ถึงปลายทางแล้ว'])
    expect(result.snappedDestinationDistanceM).toBe(4)
  })
})
