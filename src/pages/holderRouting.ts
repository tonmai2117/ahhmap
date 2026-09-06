import { ApiError } from '../api'

export type HolderRouteDecision = '/register' | '/map' | null

export function holderRouteForMeError(err: unknown): HolderRouteDecision {
  if (!(err instanceof ApiError)) return null
  if (err.status === 404 || err.status === 409) return '/register'
  if (err.status === 403) return '/map'
  return null
}
