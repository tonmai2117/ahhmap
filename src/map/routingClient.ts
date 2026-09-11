import type { MapPosition } from './mapDomain'
import { thaiInstruction, type RouteResult, type TravelMode } from './navigationDomain'

export const ROUTING_ENDPOINTS = {
  walking: 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
  driving: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
} satisfies Record<TravelMode, string>

type OsrmGeometry = { type: 'LineString'; coordinates: [number, number][] }
type OsrmStep = {
  name?: string
  distance?: number
  duration?: number
  geometry?: OsrmGeometry
  maneuver?: { type?: string; modifier?: string; exit?: number; location?: [number, number] }
}
type OsrmResponse = {
  code?: string
  message?: string
  routes?: Array<{
    distance?: number
    duration?: number
    geometry?: OsrmGeometry
    legs?: Array<{ steps?: OsrmStep[] }>
  }>
  waypoints?: Array<{ distance?: number }>
}

export class RoutingError extends Error {
  constructor(public code: 'rate_limited' | 'timeout' | 'no_route' | 'network' | 'invalid_response') {
    super(code)
  }
}

let queue = Promise.resolve()
let lastRequestStartedAt = 0
let cooldownUntil = 0

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

async function schedule<T>(job: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  let release!: () => void
  const previous = queue
  queue = new Promise<void>((resolve) => { release = resolve })
  await previous
  try {
    const delay = Math.max(0, lastRequestStartedAt + 1100 - Date.now(), cooldownUntil - Date.now())
    if (delay) await wait(delay, signal)
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    lastRequestStartedAt = Date.now()
    return await job()
  } finally {
    release()
  }
}

export function routeUrl(points: Array<Pick<MapPosition, 'lat' | 'lng'>>, mode: TravelMode) {
  const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(';')
  return `${ROUTING_ENDPOINTS[mode]}/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=false`
}

export async function fetchRoute(
  points: Array<Pick<MapPosition, 'lat' | 'lng'>>,
  mode: TravelMode,
  outerSignal?: AbortSignal,
): Promise<RouteResult> {
  if (points.length < 2) throw new RoutingError('invalid_response')
  return schedule(async () => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 15_000)
    const abort = () => controller.abort()
    outerSignal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await fetch(routeUrl(points, mode), { signal: controller.signal })
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('Retry-After'))
        cooldownUntil = Date.now() + (Number.isFinite(retryAfter) ? retryAfter * 1000 : 60_000)
        throw new RoutingError('rate_limited')
      }
      if (!response.ok) throw new RoutingError('network')
      const body = await response.json() as OsrmResponse
      const route = body.routes?.[0]
      if (body.code === 'NoRoute' || body.code === 'NoSegment' || !route) throw new RoutingError('no_route')
      if (!route.geometry?.coordinates?.length || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
        throw new RoutingError('invalid_response')
      }
      const rawSteps = route.legs?.flatMap((leg) => leg.steps ?? []) ?? []
      const steps = rawSteps.map((step, index) => {
        const maneuver = {
          type: step.maneuver?.type ?? 'continue',
          modifier: step.maneuver?.modifier,
          exit: step.maneuver?.exit,
          location: step.maneuver?.location ?? route.geometry!.coordinates[0],
        }
        return {
          id: `${index}-${maneuver.location.join(',')}`,
          instruction: thaiInstruction(maneuver, step.name),
          distanceM: step.distance ?? 0,
          durationS: step.duration ?? 0,
          geometry: step.geometry?.coordinates ?? [],
          maneuver,
        }
      })
      return {
        mode,
        geometry: route.geometry.coordinates,
        distanceM: route.distance,
        durationS: route.duration,
        steps,
        snappedDestinationDistanceM: body.waypoints?.[body.waypoints.length - 1]?.distance ?? 0,
      }
    } catch (error) {
      if (error instanceof RoutingError) throw error
      if (controller.signal.aborted && !outerSignal?.aborted) throw new RoutingError('timeout')
      throw error
    } finally {
      window.clearTimeout(timer)
      outerSignal?.removeEventListener('abort', abort)
    }
  }, outerSignal)
}

export function routingErrorMessage(error: unknown) {
  if (error instanceof RoutingError) {
    if (error.code === 'rate_limited') return 'มีการขอเส้นทางถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'
    if (error.code === 'timeout') return 'คำนวณเส้นทางนานเกินไป กรุณาลองใหม่'
    if (error.code === 'no_route') return 'ไม่พบเส้นทางสำหรับจุดหมายนี้'
  }
  return 'คำนวณเส้นทางไม่ได้ กรุณาลองใหม่'
}
