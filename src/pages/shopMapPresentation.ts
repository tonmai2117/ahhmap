export type ShopMapCampaign = { id: string }

const COLORS = ['#7c3aed', '#db2777', '#0891b2', '#ca8a04']

export function campaignColor(campaigns: ShopMapCampaign[], campaignId: string) {
  return COLORS[Math.max(0, campaigns.findIndex((campaign) => campaign.id === campaignId)) % COLORS.length]
}

export function visibleCampaigns<T extends ShopMapCampaign>(campaigns: T[], selectedId: string) {
  return selectedId ? campaigns.filter((campaign) => campaign.id === selectedId) : campaigns
}

export type ShopMarkerVariant = 'own' | 'peer'

export const SHOP_MARKER_COLORS: Record<ShopMarkerVariant, string> = { own: '#ef5128', peer: '#16a34a' }

export function shopMarkerVariant(shopId: string, currentShopId: string): ShopMarkerVariant {
  return shopId === currentShopId ? 'own' : 'peer'
}

export function shopMarkerColor(shopId: string, currentShopId: string): string {
  return SHOP_MARKER_COLORS[shopMarkerVariant(shopId, currentShopId)]
}
