import { api } from '../api'
import type {
  Campaign,
  CampaignParticipation,
  CampaignSummary,
  Host,
} from '../types'

const USE_FIXTURES = import.meta.env.DEV && import.meta.env.VITE_CAMPAIGN_FIXTURES === '1'

export type JoinCampaignResponse = {
  joined: true
  already_joined: boolean
  host_slug: string
  campaign_slug: string
}

function segment(value: string): string {
  return encodeURIComponent(value)
}

export async function getCurrentHost(): Promise<{ host: Host }> {
  if (USE_FIXTURES) {
    const { fixtureGetCurrentHost } = await import('./campaignFixtures')
    return fixtureGetCurrentHost()
  }
  return api.get<{ host: Host }>('/hosts/current')
}

export async function getHost(hostSlug: string): Promise<{ host: Host }> {
  if (USE_FIXTURES) {
    const { fixtureGetHost } = await import('./campaignFixtures')
    return fixtureGetHost(hostSlug)
  }
  return api.get<{ host: Host }>(`/hosts/${segment(hostSlug)}`)
}

export async function getHostCampaigns(
  hostSlug: string,
): Promise<{ campaigns: CampaignSummary[] }> {
  if (USE_FIXTURES) {
    const { fixtureGetHostCampaigns } = await import('./campaignFixtures')
    return fixtureGetHostCampaigns(hostSlug)
  }
  return api.get<{ campaigns: CampaignSummary[] }>(`/hosts/${segment(hostSlug)}/campaigns`)
}

export async function getCampaignDetail(
  hostSlug: string,
  campaignSlug: string,
): Promise<{ campaign: Campaign; participation: CampaignParticipation }> {
  if (USE_FIXTURES) {
    const { fixtureGetCampaignDetail } = await import('./campaignFixtures')
    return fixtureGetCampaignDetail(hostSlug, campaignSlug)
  }
  return api.get<{ campaign: Campaign; participation: CampaignParticipation }>(
    `/hosts/${segment(hostSlug)}/campaigns/${segment(campaignSlug)}`,
  )
}

export async function joinCampaign(
  hostSlug: string,
  campaignSlug: string,
): Promise<JoinCampaignResponse> {
  if (USE_FIXTURES) {
    const { fixtureJoinCampaign } = await import('./campaignFixtures')
    return fixtureJoinCampaign(hostSlug, campaignSlug)
  }
  // Deliberately omit the body. The authenticated LINE user is the participant.
  return api.post<JoinCampaignResponse>(
    `/hosts/${segment(hostSlug)}/campaigns/${segment(campaignSlug)}/join`,
  )
}
