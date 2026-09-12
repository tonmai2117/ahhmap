import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGeolocation } from '../hooks/useGeolocation'

beforeEach(() => { window.history.replaceState(null, '', '/') })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('real-time device GPS', () => {
  it('reports an error without inventing a fallback position when geolocation is unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    const onPosition = vi.fn()
    const onError = vi.fn()
    renderHook(() => useGeolocation({ watch: true, onPosition, onError }))
    expect(onPosition).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'geolocation_unavailable' }))
  })

  it('streams device positions by default and clears the watcher on unmount', () => {
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: { latitude: 13.72, longitude: 100.51, accuracy: 6 },
      } as GeolocationPosition)
      return 7
    })
    const clearWatch = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true, value: { watchPosition, clearWatch },
    })
    const onPosition = vi.fn()
    const { unmount } = renderHook(() => useGeolocation({
      watch: true,
      options: { enableHighAccuracy: true, maximumAge: 3_000, timeout: 15_000 },
      onPosition,
    }))
    expect(watchPosition).toHaveBeenCalledOnce()
    expect(watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 15_000 },
    )
    expect(onPosition).toHaveBeenCalledWith({ lat: 13.72, lng: 100.51, accuracy: 6 })
    unmount()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })
})
