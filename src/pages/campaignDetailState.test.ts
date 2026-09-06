import { describe, expect, it } from 'vitest'
import { ApiError } from '../api'
import { campaignDetailFailureState } from './campaignDetailState'

describe('campaign detail deep-link failure state', () => {
  it.each(['host_not_found', 'campaign_not_found'])(
    'renders a not-found state for %s',
    (errorCode) => {
      expect(campaignDetailFailureState(new ApiError(404, errorCode))).toBe('not_found')
    },
  )

  it('keeps service and network failures retryable', () => {
    expect(campaignDetailFailureState(new ApiError(503, 'campaign_unavailable'))).toBe('error')
    expect(campaignDetailFailureState(new TypeError('network failed'))).toBe('error')
  })
})
