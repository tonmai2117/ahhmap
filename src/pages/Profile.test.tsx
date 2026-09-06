import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../api'
import Profile from './Profile'
import type { LeaderboardEntry } from '../types'

vi.mock('../api', () => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('../liff', () => ({ getProfile: vi.fn(async () => ({ displayName: 'Peam', pictureUrl: undefined })) }))
vi.mock('../utils/format', () => ({
  formatThaiDate: () => '1 ม.ค. 2569',
  formatThaiDateTime: () => '1 ม.ค. 2569 00:00',
  formatThaiShortDate: () => '1 ม.ค.',
}))

const PROFILE = {
  coin_balance: 12,
  portals_today: 1,
  portals_total: 4,
  host_rank: 1,
  active_coupons: 0,
  used_coupons: 0,
  join_date: '2026-01-01T00:00:00.000Z',
}

const NAMES = ['Peam', 'Tawan', 'Nok', 'Ploy', 'Ton']

const PIC = 'https://profile.line-scdn.net/0hPeamAvatar'

function entries(count: number, pictures: Array<string | null> = []): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    user_id: `u${i + 1}`,
    display_name: NAMES[i],
    portals: 10 - i,
    picture_url: pictures[i] ?? null,
  }))
}

async function openLeaderboard(board: LeaderboardEntry[], meUserId = 'me') {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === '/profile') return PROFILE
    if (path === '/leaderboard') {
      const mine = board.find((e) => e.user_id === meUserId)
      return { entries: board, me: { rank: mine?.rank ?? null, portals: mine?.portals ?? 0, user_id: meUserId } }
    }
    throw new Error(`unexpected path: ${path}`)
  })

  const user = userEvent.setup()
  render(<MemoryRouter><Profile /></MemoryRouter>)
  await user.click(await screen.findByLabelText('Switch to leaderboard'))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Profile leaderboard table', () => {
  it('lists both players when only two qualify (the live shape)', async () => {
    await openLeaderboard(entries(2))

    const rows = await screen.findByTestId('leaderboard-rows')
    expect(rows.children).toHaveLength(2)
    expect(within(rows).getByText('Peam')).toBeTruthy()
    expect(within(rows).getByText('Tawan')).toBeTruthy()
  })

  it('lists all three players when the podium is exactly full', async () => {
    await openLeaderboard(entries(3))

    const rows = await screen.findByTestId('leaderboard-rows')
    expect(rows.children).toHaveLength(3)
  })

  it('lists every player in rank order beyond the podium', async () => {
    await openLeaderboard(entries(5))

    const rows = await screen.findByTestId('leaderboard-rows')
    expect(rows.children).toHaveLength(5)
    const positions = Array.from(rows.children).map((row) => row.firstElementChild?.textContent)
    expect(positions).toEqual(['1', '2', '3', '4', '5'])
  })

  it('shows the empty state instead of a podium or table when nobody qualifies', async () => {
    await openLeaderboard([])

    expect(await screen.findByText('ยังไม่มีผู้เล่นบนกระดานอันดับ')).toBeTruthy()
    expect(screen.queryByTestId('leaderboard-rows')).toBeNull()
    expect(screen.queryByText('Gamer Tag')).toBeNull()
  })

  it("highlights the viewer's own row even when they are on the podium", async () => {
    await openLeaderboard(entries(3), 'u2')

    const rows = await screen.findByTestId('leaderboard-rows')
    const mineRow = within(rows).getByText('Tawan (คุณ)').closest('div[style]')?.parentElement
    expect(mineRow).toBeTruthy()
    expect(mineRow?.getAttribute('style')).toContain('fill-subtle')
    expect(within(rows).queryByText('Peam (คุณ)')).toBeNull()
  })
})

describe('Profile leaderboard avatars', () => {
  it('renders the stored LINE picture on both the podium and the table row', async () => {
    await openLeaderboard(entries(2, [PIC, null]))

    const rows = await screen.findByTestId('leaderboard-rows')
    const avatars = screen.getAllByAltText('รูปโปรไฟล์ของ Peam')
    expect(avatars).toHaveLength(2)
    expect(avatars.map((img) => img.getAttribute('src'))).toEqual([PIC, PIC])
    expect(within(rows).getAllByAltText('รูปโปรไฟล์ของ Peam')).toHaveLength(1)
  })

  it('renders no image for a player whose picture_url is null', async () => {
    await openLeaderboard(entries(2, [PIC, null]))

    await screen.findByTestId('leaderboard-rows')
    expect(screen.queryByAltText('รูปโปรไฟล์ของ Tawan')).toBeNull()
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('degrades to the placeholder when the LINE CDN image fails to load', async () => {
    await openLeaderboard(entries(1, [PIC]))

    await screen.findByTestId('leaderboard-rows')
    const avatars = screen.getAllByAltText('รูปโปรไฟล์ของ Peam')
    expect(avatars).toHaveLength(2)

    avatars.forEach((img) => fireEvent.error(img))

    await waitFor(() => expect(screen.queryAllByAltText('รูปโปรไฟล์ของ Peam')).toHaveLength(0))
  })
})
