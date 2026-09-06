import { describe, expect, it } from 'vitest'
import { campaignColor, shopMarkerColor, shopMarkerVariant, visibleCampaigns } from './shopMapPresentation'

const campaigns = [
  { id: 'first', title: 'First', status: 'active' as const, portals: [] },
  { id: 'second', title: 'Second', status: 'active' as const, portals: [] },
]

describe('ShopMap campaign presentation', () => {
  it('keeps each campaign color stable when the selected campaign changes', () => {
    expect(campaignColor(campaigns, 'first')).toBe('#7c3aed')
    expect(campaignColor(campaigns, 'second')).toBe('#db2777')
  })

  it('limits the rendered route and map bounds to the selected campaign', () => {
    expect(visibleCampaigns(campaigns, 'second')).toEqual([campaigns[1]])
    expect(visibleCampaigns(campaigns, '')).toEqual(campaigns)
  })
})

describe('ShopMap shop marker presentation', () => {
  it('colors the current shop orange and every other shop in the Host green', () => {
    expect(shopMarkerColor('own', 'own')).toBe('#ef5128')
    expect(shopMarkerColor('peer', 'own')).toBe('#16a34a')
  })

  it('classifies shop markers as own or peer relative to the current shop', () => {
    expect(shopMarkerVariant('own', 'own')).toBe('own')
    expect(shopMarkerVariant('peer', 'own')).toBe('peer')
  })
})
