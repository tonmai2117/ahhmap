import { ApiError } from '../api'
import type {
  Campaign,
  CampaignParticipation,
  CampaignSummary,
  Host,
} from '../types'

const DEMO_HOST: Host = {
  slug: 'demo-host',
  name: 'AR Map Studio',
  title: 'Heading',
  description: "Body text for your whole article or post. We'll put in some sample copy to show how a filled-out page might look.",
  logo_url: null,
  cover_url: null,
}

const EMPTY_HOST: Host = {
  slug: 'empty-host',
  name: 'Empty Host',
  title: 'Campaigns are coming soon',
  description: 'There are no published campaigns for this host yet.',
  logo_url: null,
  cover_url: null,
}

const CAMPAIGNS: Campaign[] = [
  {
    slug: 'bantadthong-halloween',
    title: 'Bantadthong Halloween',
    subtitle: 'Shooting Game',
    description: "Body text for your whole article or post. We'll put in some sample copy to show how a filled-out page might look.",
    how_to_play: 'เดินทางไปยัง Portal ที่แสดงบนแผนที่ เมื่ออยู่ในระยะให้เปิดเกม AR แล้วเล่นให้จบเพื่อรับเหรียญ',
    cover_url: null,
    badge_image_url: null,
    location_text: '2030 2080 ถนน บรรทัดทอง รองเมือง เขตปทุมวัน กรุงเทพมหานคร 10330',
    lat: 13.741,
    lng: 100.5225,
    starts_at: '2026-10-28T17:00:00.000Z',
    ends_at: '2026-10-31T16:59:59.999Z',
    status: 'active',
    days_remaining: 3,
  },
  {
    slug: 'active-joined',
    title: 'City Portal Challenge',
    subtitle: 'AR Treasure Hunt',
    description: 'Follow the campaign map and discover every featured Portal.',
    how_to_play: 'เลือก Portal บนแผนที่ เดินไปยังจุดหมาย แล้วเปิดประสบการณ์ AR',
    cover_url: null,
    badge_image_url: null,
    location_text: 'กรุงเทพมหานคร',
    lat: 13.741,
    lng: 100.5225,
    starts_at: '2026-10-28T17:00:00.000Z',
    ends_at: '2026-11-05T16:59:59.999Z',
    status: 'active',
    days_remaining: 8,
  },
  {
    slug: 'upcoming-campaign',
    title: 'Next City Adventure',
    subtitle: 'Coming soon',
    description: 'A new city adventure is almost here.',
    how_to_play: 'กลับมาอีกครั้งเมื่อกิจกรรมเริ่มต้น',
    cover_url: null,
    badge_image_url: null,
    location_text: 'กรุงเทพมหานคร',
    lat: null,
    lng: null,
    starts_at: '2026-11-09T17:00:00.000Z',
    ends_at: '2026-11-15T16:59:59.999Z',
    status: 'upcoming',
    days_remaining: 15,
  },
  {
    slug: 'ended-campaign',
    title: 'Past Portal Weekend',
    subtitle: 'Campaign archive',
    description: 'This campaign has ended, but its detail page remains available.',
    how_to_play: 'กิจกรรมนี้สิ้นสุดแล้ว',
    cover_url: null,
    badge_image_url: null,
    location_text: 'กรุงเทพมหานคร',
    lat: null,
    lng: null,
    starts_at: '2026-07-01T17:00:00.000Z',
    ends_at: '2026-07-03T16:59:59.999Z',
    status: 'ended',
    days_remaining: -28,
  },
]

const joinedCampaigns = new Map<string, CampaignParticipation>([
  ['active-joined', {
    joined: true,
    joined_at: '2026-10-29T02:30:00.000Z',
    last_active_at: null,
  }],
])

function summary(campaign: Campaign): CampaignSummary {
  const {
    slug,
    title,
    subtitle,
    cover_url,
    badge_image_url,
    starts_at,
    ends_at,
    status,
    days_remaining,
  } = campaign
  return {
    slug,
    title,
    subtitle,
    cover_url,
    badge_image_url,
    starts_at,
    ends_at,
    status,
    days_remaining,
  }
}

function hostFor(slug: string): Host {
  if (slug === DEMO_HOST.slug) return DEMO_HOST
  if (slug === EMPTY_HOST.slug) return EMPTY_HOST
  throw new ApiError(404, 'host_not_found')
}

export async function fixtureGetCurrentHost(): Promise<{ host: Host }> {
  return { host: DEMO_HOST }
}

export async function fixtureGetHost(hostSlug: string): Promise<{ host: Host }> {
  return { host: hostFor(hostSlug) }
}

export async function fixtureGetHostCampaigns(
  hostSlug: string,
): Promise<{ campaigns: CampaignSummary[] }> {
  hostFor(hostSlug)
  return { campaigns: hostSlug === EMPTY_HOST.slug ? [] : CAMPAIGNS.map(summary) }
}

export async function fixtureGetCampaignDetail(
  hostSlug: string,
  campaignSlug: string,
): Promise<{ campaign: Campaign; participation: CampaignParticipation }> {
  hostFor(hostSlug)
  const campaign = CAMPAIGNS.find((item) => item.slug === campaignSlug)
  if (!campaign) throw new ApiError(404, 'campaign_not_found')
  return {
    campaign,
    participation: joinedCampaigns.get(campaignSlug) ?? {
      joined: false,
      joined_at: null,
      last_active_at: null,
    },
  }
}

export async function fixtureJoinCampaign(
  hostSlug: string,
  campaignSlug: string,
): Promise<{
  joined: true
  already_joined: boolean
  host_slug: string
  campaign_slug: string
}> {
  const { campaign } = await fixtureGetCampaignDetail(hostSlug, campaignSlug)
  if (campaign.status !== 'active') throw new ApiError(409, 'campaign_not_joinable')

  const alreadyJoined = joinedCampaigns.get(campaignSlug)?.joined === true
  if (!alreadyJoined) {
    joinedCampaigns.set(campaignSlug, {
      joined: true,
      joined_at: new Date().toISOString(),
      last_active_at: null,
    })
  }

  return {
    joined: true,
    already_joined: alreadyJoined,
    host_slug: hostSlug,
    campaign_slug: campaignSlug,
  }
}
