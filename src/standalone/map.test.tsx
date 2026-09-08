import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { api } from '../api'

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}{location.search}</output>
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Unexpected backend request'))))
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition: vi.fn(() => 1), clearWatch: vi.fn() },
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('standalone map', () => {
  it.each(['/', '/map'])('opens the original map at %s without LINE or a backend', async (path) => {
    const { container } = render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('ผู้เล่น')).toBeTruthy())
    expect(container.querySelector('.leaflet-container')).toBeTruthy()
    expect(container.querySelector('.leaflet-tile-pane')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'เข้าใกล้ Portal เพื่อเริ่มเกม' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText('เพิ่มเพื่อน LINE Official Account')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps old page links on the map and preserves campaign parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/wallet?campaign=test&host=host']}>
        <App /><LocationProbe />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/map?campaign=test&host=host'))
    expect(screen.getByText('แผนที่กิจกรรม')).toBeTruthy()
  })

  it('switches modes and collapses the original map sheet', async () => {
    render(<MemoryRouter><App /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /ภารกิจ Event: Portal Route/ }))
    const title = await screen.findByText('Portal Route', { exact: true })
    expect(screen.getByText('เดินตามเส้นทางตามลำดับ')).toBeTruthy()
    const sheet = title.closest('div')?.parentElement?.parentElement?.parentElement
    expect(sheet?.style.transform).toBe('translateY(0px)')
    // jsdom does not perform layout; provide the sheet's measured height.
    Object.defineProperty(sheet, 'offsetHeight', { configurable: true, value: 260 })
    fireEvent.click(title)
    expect(sheet?.style.transform).toBe('translateY(196px)')
    fireEvent.click(screen.getByRole('button', { name: /Portal ใกล้คุณ/ }))
    expect(screen.getByText('0 จุดในรัศมี 500 ม.')).toBeTruthy()
  })

  it('does not invent portal data or report a successful reward collection', async () => {
    await expect(api.get('/treasures')).resolves.toEqual({ treasures: [] })
    await expect(api.get('/me')).resolves.toEqual({ coin_balance: null })
    await expect(api.post('/treasures/test/collect', { lat: 13.7, lng: 100.5 })).rejects.toMatchObject({ status: 503 })
  })
})
