export type TreasureTier = 'common' | 'rare' | 'epic' | 'legendary'

export type Treasure = {
  id: string
  name: string
  lat: number
  lng: number
  radius_m: number
  coin_reward: number
  ar_content: string | null
  tier?: TreasureTier | null
}

export type CampaignStatus = 'upcoming' | 'active' | 'ended'

export type Host = {
  slug: string
  name: string
  title: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
}

export type Campaign = {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  how_to_play: string | null
  cover_url: string | null
  badge_image_url: string | null
  location_text: string | null
  lat: number | null
  lng: number | null
  starts_at: string
  ends_at: string
  status: CampaignStatus
  days_remaining: number
}

export type CampaignSummary = Pick<
  Campaign,
  | 'slug'
  | 'title'
  | 'subtitle'
  | 'cover_url'
  | 'badge_image_url'
  | 'starts_at'
  | 'ends_at'
  | 'status'
  | 'days_remaining'
>

export type CampaignParticipation = {
  joined: boolean
  joined_at: string | null
  last_active_at: string | null
}

export type Coupon = {
  id: string
  title: string
  description: string | null
  coin_cost: number
  qr_payload: string
  valid_until: string
  active: boolean
  created_at: string
}

/** `GET /coupons` (market listing) joins the owning shop's name; `GET /my-shop/coupons` doesn't. */
export type MarketCoupon = Coupon & { shops: { name: string } }

export type Redemption = {
  id: string
  status: 'redeemed' | 'in_use' | 'used' | 'expired'
  redeemed_at: string
  use_started_at: string | null
  expires_at: string | null
  used_at: string | null
  coupons: {
    title: string
    description: string | null
    coin_cost: number
    qr_payload: string
    shops: { name: string }
  }
}

export type Stats = {
  shop?: { id?: string; name: string }
  nearby_unique_users: number
  redeem_count: number
  used_count: number
}

export type ShopCoupon = {
  id: string
  title: string
  description: string | null
  coin_cost: number
  valid_until: string
  shop: { id: string; name: string; is_current: boolean }
}

export type ShopAggregateStat = {
  shop: { id: string; name: string; is_current: boolean }
  nearby_unique_users: number
  redeem_count: number
  used_count: number
}

export type ProfileResponse = {
  coin_balance: number
  portals_today: number
  portals_total: number
  host_rank: number | null
  active_coupons: number
  used_coupons: number
  join_date: string
}

export type LeaderboardEntry = {
  rank: number
  user_id: string
  display_name: string
  portals: number
  picture_url: string | null
}

export type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  me: { rank: number | null; portals: number; user_id: string }
}
