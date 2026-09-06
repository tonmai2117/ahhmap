import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../api'
import ShopCoupons from './ShopCoupons'
import ShopHost from './ShopHost'
import ShopStats from './ShopStats'

const { shopAccessState } = vi.hoisted(() => ({ shopAccessState: { loading: false, error: '' } }))
vi.mock('../api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('./shopAccess', () => ({ useShopAccess: () => shopAccessState }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  shopAccessState.loading = false
  shopAccessState.error = ''
})

function renderPage(page: React.ReactElement, entry = '/') {
  return render(<MemoryRouter initialEntries={[entry]}>{page}</MemoryRouter>)
}

describe('Shop pages', () => {
  it('loads network coupons (own shop included) into the all-coupons tab, newest first, without exposing QR payloads', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => {
      if (path === '/my-shop/coupons') return { coupons: [] }
      if (path === '/my-shop/network-coupons') {
        return {
          coupons: [
            { id: 'own-coupon', title: 'Own network coupon', description: null, coin_cost: 15, valid_until: '2030-01-01T00:00:00.000Z', shop: { id: 'own-shop', name: 'Own shop', is_current: true } },
            { id: 'peer-coupon', title: 'Peer coupon', description: null, coin_cost: 20, valid_until: '2030-01-01T00:00:00.000Z', shop: { id: 'peer-shop', name: 'Peer shop', is_current: false } },
          ],
        }
      }
      throw new Error(`unexpected path: ${path}`)
    })

    renderPage(<ShopCoupons />, '/shop/coupons?tab=all')

    expect(await screen.findByText('Own network coupon')).toBeTruthy()
    expect(screen.getByText('Peer coupon')).toBeTruthy()
    expect(screen.getByText('Peer shop')).toBeTruthy()
    expect(screen.getAllByText('ร้านของฉัน')).toHaveLength(1)
    expect(screen.queryByText(/QR:/)).toBeNull()
    expect(api.get).toHaveBeenCalledWith('/my-shop/coupons')
    expect(api.get).toHaveBeenCalledWith('/my-shop/network-coupons')

    const titles = screen.getAllByText(/coupon$/i).map((el) => el.textContent)
    expect(titles.indexOf('Own network coupon')).toBeLessThan(titles.indexOf('Peer coupon'))
  })

  it('switches coupon tabs without mixing a peer coupon into own-coupon management', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockImplementation(async (path) => path === '/my-shop/coupons'
      ? { coupons: [{ id: 'own-coupon', title: 'Own coupon', description: null, coin_cost: 10, valid_until: '2030-01-01T00:00:00.000Z', qr_payload: 'private-own-qr', active: true }] }
      : { coupons: [{ id: 'peer-coupon', title: 'Peer coupon', description: null, coin_cost: 20, valid_until: '2030-01-01T00:00:00.000Z', shop: { id: 'peer-shop', name: 'Peer shop' } }] })

    renderPage(<ShopCoupons />)
    expect(await screen.findByText('Own coupon')).toBeTruthy()
    await user.click(screen.getByText('คูปองทั้งหมด'))
    expect(await screen.findByText('Peer coupon')).toBeTruthy()
    expect(screen.queryByText('Own coupon')).toBeNull()
  })

  it('loads own and aggregate stats from their separate contracts', async () => {
    vi.mocked(api.get).mockImplementation(async (path) => path === '/my-shop/stats'
      ? { shop: { id: 'own', name: 'My shop' }, nearby_unique_users: 4, redeem_count: 2, used_count: 1 }
      : { shops: [{ shop: { id: 'own', name: 'My shop', is_current: true }, nearby_unique_users: 4, redeem_count: 2, used_count: 1 }] })

    renderPage(<ShopStats />)
    expect(await screen.findByText('My shop')).toBeTruthy()
    expect(api.get).toHaveBeenCalledWith('/my-shop/stats')
    expect(api.get).toHaveBeenCalledWith('/my-shop/stats/aggregate')
  })

  it('renders aggregate stat cards with an avatar initial, all three metrics and a single current-shop badge', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockImplementation(async (path) => path === '/my-shop/stats'
      ? { shop: { id: 'own', name: 'My shop' }, nearby_unique_users: 4, redeem_count: 2, used_count: 1 }
      : {
          shops: [
            { shop: { id: 'own', name: 'Bantatthong Cafe', is_current: true }, nearby_unique_users: 0, redeem_count: 3, used_count: 3 },
            { shop: { id: 'peer', name: 'Peer shop', is_current: false }, nearby_unique_users: 8, redeem_count: 3, used_count: 2 },
          ],
        })

    renderPage(<ShopStats />)
    expect(await screen.findByText('My shop')).toBeTruthy()
    await user.click(screen.getByText('สถิติรวม'))

    expect(await screen.findByText('Bantatthong Cafe')).toBeTruthy()
    expect(screen.getByText('B')).toBeTruthy()
    expect(screen.getByText('Peer shop')).toBeTruthy()
    expect(screen.getAllByText('คนเข้าใกล้ร้าน')).toHaveLength(2)
    expect(screen.getAllByText('แลกคูปอง')).toHaveLength(2)
    expect(screen.getAllByText('ใช้งานจริง')).toHaveLength(2)
    expect(screen.getAllByText('นับจากการเก็บสมบัติหน้าร้าน')).toHaveLength(2)
    expect(screen.getAllByText('ร้านของฉัน')).toHaveLength(1)
  })

  it('renders the read-only Host campaign response', async () => {
    vi.mocked(api.get).mockResolvedValue({
      host: { id: 'host-a', slug: 'aahhtech', name: 'Aahhtech', title: 'Aahhtech Host', description: 'Host description', logo_url: null, cover_url: null },
      campaigns: [{ slug: 'campaign-a', title: 'Active campaign', starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2030-01-01T00:00:00.000Z', days_remaining: 1, status: 'active', cover_url: null }],
    })

    renderPage(<ShopHost />)
    expect(await screen.findByText('Aahhtech Host')).toBeTruthy()
    expect(await screen.findByText('Active campaign')).toBeTruthy()
    expect(api.get).toHaveBeenCalledWith('/my-shop/host')
    await waitFor(() => expect(screen.queryByRole('button', { name: /join|play|แลก/i })).toBeNull())
    expect(screen.getByRole('link', { name: /Active campaign/ }).getAttribute('href')).toBe('/hosts/aahhtech/campaigns/campaign-a?from=shop')
  })

  it.each([
    ['coupons', <ShopCoupons />],
    ['stats', <ShopStats />],
    ['host', <ShopHost />],
  ])('shows the Shop access error instead of an endless spinner on %s', (_name, page) => {
    shopAccessState.error = 'ตรวจสอบสถานะร้านไม่ได้'

    renderPage(page)

    expect(screen.getByText('ตรวจสอบสถานะร้านไม่ได้')).toBeTruthy()
    expect(api.get).not.toHaveBeenCalled()
  })
})
