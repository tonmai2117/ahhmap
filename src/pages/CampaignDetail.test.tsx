import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getCampaignDetail } from '../api/campaigns'
import CampaignDetail from './CampaignDetail'

vi.mock('../api/campaigns', () => ({ getCampaignDetail: vi.fn(), joinCampaign: vi.fn() }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/hosts/:hostSlug/campaigns/:campaignSlug" element={<CampaignDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

const campaign = {
  slug: 'campaign-a', title: 'Campaign A', subtitle: null, description: null, how_to_play: null,
  cover_url: null, badge_image_url: null, location_text: null, lat: null, lng: null,
  starts_at: '2025-01-01T00:00:00.000Z', ends_at: '2030-01-01T00:00:00.000Z', status: 'active' as const, days_remaining: 5,
}
const participation = { joined: false, joined_at: null, last_active_at: null }

describe('CampaignDetail read-only shop view', () => {
  it('hides the join CTA when opened from the Shop host page', async () => {
    vi.mocked(getCampaignDetail).mockResolvedValue({ campaign, participation })

    renderAt('/hosts/h/campaigns/campaign-a?from=shop')

    expect(await screen.findByText('Campaign A')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /เข้าร่วมเลย/ })).toBeNull()
  })

  it('shows the join CTA for the normal player flow', async () => {
    vi.mocked(getCampaignDetail).mockResolvedValue({ campaign, participation })

    renderAt('/hosts/h/campaigns/campaign-a')

    expect(await screen.findByText('Campaign A')).toBeTruthy()
    expect(screen.getByRole('button', { name: /เข้าร่วมเลย/ })).toBeTruthy()
  })
})
