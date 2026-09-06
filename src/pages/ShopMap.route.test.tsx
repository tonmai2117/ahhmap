import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { api } from '../api'
import ShopMap from './ShopMap'

const { leaflet } = vi.hoisted(() => ({ leaflet: {
  map: vi.fn(() => ({ setView: vi.fn().mockReturnThis(), on: vi.fn(), remove: vi.fn(), fitBounds: vi.fn(), panTo: vi.fn() })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  marker: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis(), addTo: vi.fn() })),
  divIcon: vi.fn(() => ({})),
  circle: vi.fn(() => ({ addTo: vi.fn() })),
  polyline: vi.fn(() => ({ addTo: vi.fn() })),
  layerGroup: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() })),
  latLngBounds: vi.fn(() => ({})),
} }))

vi.mock('leaflet', () => ({ default: leaflet }))
vi.mock('../api', () => ({ api: { get: vi.fn() } }))
vi.mock('./shopAccess', () => ({ useShopAccess: () => ({ loading: false, error: '' }) }))

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver)

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('ShopMap route', () => {
  it('uses only the Shop map contract and never requests browser location or gameplay APIs', async () => {
    const geolocation = vi.fn()
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: geolocation, watchPosition: geolocation } })
    vi.mocked(api.get).mockResolvedValue({
      host: { id: 'host-a', slug: 'aahhtech', name: 'Aahhtech' },
      current_shop_id: 'own',
      shops: [{ id: 'own', name: 'My shop', lat: 13.7, lng: 100.5 }],
      campaigns: [{
        id: 'campaign', slug: 'campaign', title: 'Campaign', status: 'active',
        portals: [{ id: 'portal', name: 'Portal', lat: 13.71, lng: 100.51, sequence: 1, coin_reward: 10, radius_m: 30 }],
      }],
    })

    render(<ShopMap />)
    expect(await screen.findByText('Portal')).toBeTruthy()
    await waitFor(() => expect(leaflet.map).toHaveBeenCalled())
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/my-shop/map')
    expect(geolocation).not.toHaveBeenCalled()
    expect(leaflet.circle).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /เข้า Portal|เข้าใกล้ Portal/ })).toBeNull()
  })
})
