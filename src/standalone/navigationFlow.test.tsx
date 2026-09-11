import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import L from 'leaflet'

const { fetchRouteMock } = vi.hoisted(() => ({ fetchRouteMock: vi.fn() }))
vi.mock('../map/routingClient', () => ({
  fetchRoute: fetchRouteMock,
  routingErrorMessage: () => 'คำนวณเส้นทางไม่ได้ กรุณาลองใหม่',
}))

const App = (await import('../App')).default
const originalSvgSupport = L.Browser.svg

class ResizeObserverStub { observe() {} disconnect() {} }

const routeResult = {
  mode: 'walking' as const,
  geometry: [[100.5285, 13.7466], [100.5294, 13.7463], [100.5303, 13.746]] as [number, number][],
  distanceM: 218.9,
  durationS: 175.2,
  snappedDestinationDistanceM: 2,
  steps: [
    { id: '1', instruction: 'เริ่มเดินทาง', distanceM: 180, durationS: 140, geometry: [], maneuver: { type: 'depart', location: [100.5285, 13.7466] as [number, number] } },
    { id: '2', instruction: 'ถึงปลายทางแล้ว', distanceM: 38.9, durationS: 35.2, geometry: [], maneuver: { type: 'arrive', location: [100.5303, 13.746] as [number, number] } },
  ],
}

beforeEach(() => {
  window.history.replaceState(null, '', '/map?demo=1')
  localStorage.clear()
  fetchRouteMock.mockReset().mockResolvedValue(routeResult)
  Object.defineProperty(L.Browser, 'svg', { configurable: true, writable: true, value: true })
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() } })
})

afterEach(() => {
  cleanup()
  Object.defineProperty(L.Browser, 'svg', { configurable: true, writable: true, value: originalSvgSupport })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('destination navigation flow', () => {
  it('navigates to the Bangkok fixture with walking by default and can recalculate for driving', async () => {
    render(<MemoryRouter initialEntries={['/map?demo=1']}><App /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'นำทางไป…' }))
    expect(screen.getByRole('button', { name: 'เดิน' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'จุดทดสอบ A (กรุงเทพฯ)' }))
    fireEvent.click(screen.getByRole('button', { name: 'ดูเส้นทาง' }))
    await waitFor(() => expect(fetchRouteMock).toHaveBeenCalledWith(
      [{ lat: 13.7466, lng: 100.5285, accuracy: 10 }, expect.objectContaining({ lat: 13.746, lng: 100.5303 })],
      'walking',
      expect.any(AbortSignal),
    ))
    expect(await screen.findByText('3 นาที')).toBeTruthy()
    expect(screen.getByText('เริ่มเดินทาง')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'รถ' }))
    await waitFor(() => expect(fetchRouteMock).toHaveBeenLastCalledWith(expect.any(Array), 'driving', expect.any(AbortSignal)))
  })

  it('switches the page theme without requesting another route', async () => {
    render(<MemoryRouter initialEntries={['/map?demo=1']}><App /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Dark' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(localStorage.getItem('aahhmap-theme')).toBe('dark')
    expect(fetchRouteMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })
})
