import { ApiError } from '../api'

export type CampaignDetailFailureState = 'not_found' | 'error'

export function campaignDetailFailureState(err: unknown): CampaignDetailFailureState {
  if (
    err instanceof ApiError &&
    err.status === 404 &&
    (err.message === 'host_not_found' || err.message === 'campaign_not_found')
  ) {
    return 'not_found'
  }
  return 'error'
}
