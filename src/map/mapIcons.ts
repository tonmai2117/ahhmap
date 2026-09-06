import L from 'leaflet'
import { TIER_COLORS } from './mapDomain'
import { SHOP_MARKER_COLORS, type ShopMarkerVariant } from '../pages/shopMapPresentation'
import type { TreasureTier } from '../types'

const SHOP_ICON_PATH = 'M4 4h16l1 5v2h-2v9h-5v-6h-4v6H5v-9H3V9l1-5Zm2 2-.6 3h13.2L18 6H6Zm1 5v7h1v-6h8v6h1v-7H7Z'

export function treasureIcon(tier: TreasureTier) {
  const color = TIER_COLORS[tier]
  return L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:52px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))">
        <div style="position:absolute;left:6px;top:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff"></div>
        <div style="position:absolute;left:12px;top:6px;width:20px;height:20px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:${color};font-size:14px;font-weight:900;transform:rotate(0deg)">★</div>
      </div>
    `,
    className: '',
    iconSize: [44, 52],
    iconAnchor: [22, 46],
  })
}

export function shopIcon(variant: ShopMarkerVariant) {
  const color = SHOP_MARKER_COLORS[variant]
  return L.divIcon({
    html: `
      <div style="position:relative;width:40px;height:48px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35))">
        <div style="position:absolute;left:4px;top:0;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:3px solid #fff"></div>
        <div style="position:absolute;left:10px;top:6px;width:20px;height:20px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;transform:rotate(0deg)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${color}"><path d="${SHOP_ICON_PATH}"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [40, 48],
    iconAnchor: [20, 42],
  })
}
