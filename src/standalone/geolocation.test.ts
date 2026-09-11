import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGeolocation } from '../hooks/useGeolocation'

beforeEach(() => { window.history.replaceState(null, '', '/') })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('Bangkok test GPS', () => {
  it('reports a Bangkok position even when device geolocation is unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
    const onPosition = vi.fn()
    const onError = vi.fn()
    renderHook(() => useGeolocation({ watch: true, onPosition, onError }))
    expect(onPosition).toHaveBeenCalledWith({ lat: 13.7466, lng: 100.5285, accuracy: 10 })
    expect(onError).not.toHaveBeenCalled()
  })

  it('keeps device GPS and watch cleanup available through ?gps=real', () => {
    window.history.replaceState(null, '', '/map?gps=real')
    const watchPosition = vi.fn(() => 7)
    const clearWatch = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true, value: { watchPosition, clearWatch },
    })
    const onPosition = vi.fn()
    const { unmount } = renderHook(() => useGeolocation({ watch: true, onPosition }))
    expect(watchPosition).toHaveBeenCalledOnce()
    expect(onPosition).not.toHaveBeenCalled()
    unmount()
    expect(clearWatch).toHaveBeenCalledWith(7)
  })
})
