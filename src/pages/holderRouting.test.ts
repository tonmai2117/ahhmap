import { describe, expect, it } from 'vitest'
import { ApiError } from '../api'
import { holderRouteForMeError } from './holderRouting'

describe('Holder /me routing decisions', () => {
  it('routes confirmed business states and keeps infrastructure failures retryable', () => {
    expect(holderRouteForMeError(new ApiError(404, 'not_registered'))).toBe('/register')
    expect(holderRouteForMeError(new ApiError(409, 'registration_incomplete'))).toBe('/register')
    expect(holderRouteForMeError(new ApiError(403, 'forbidden'))).toBe('/map')
    expect(holderRouteForMeError(new ApiError(503, 'me_unavailable'))).toBeNull()
    expect(holderRouteForMeError(new TypeError('network failed'))).toBeNull()
  })
})
