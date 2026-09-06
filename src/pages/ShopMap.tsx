import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { api } from '../api'
import { Chip, Empty, Spinner } from '../components/ui'
import { ShopMapSheet, type ShopMapSheetPortal } from '../components/ShopMapSheet'
import { shopIcon, treasureIcon } from '../map/mapIcons'
import { TIER_COLORS } from '../map/mapDomain'
import { CARTO_TILE_OPTIONS, CARTO_VOYAGER_TILE_URL, PLAYER_MAP_CENTER } from '../utils/mapDefaults'
import { campaignColor, shopMarkerVariant, visibleCampaigns } from './shopMapPresentation'
import { useShopAccess } from './shopAccess'

type Portal = { id: string; name: string; lat: number; lng: number; sequence: number; coin_reward: number; radius_m: number }
type Campaign = { id: string; slug: string; title: string; status: 'active'; portals: Portal[] }
type ShopPoint = { id: string; name: string; lat: number; lng: number }
type Data = { host: { id: string; slug: string; name: string }; current_shop_id: string; shops: ShopPoint[]; campaigns: Campaign[] }

// The Shop map contract has no per-portal rarity data (the DB column backing it is
// named `rarity`, not `tier`, and isn't wired up here) — every portal renders as 'rare'.
const PORTAL_TIER = 'rare' as const

export default function ShopMap() {
  const access = useShopAccess()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [sheetState, setSheetState] = useState<'expanded' | 'collapsed'>('expanded')

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (access.loading || access.error) return
    api.get<Data>('/my-shop/map')
      .then((result) => {
        setData(result)
        setSelected(result.campaigns[0]?.id ?? '')
      })
      .catch(() => setError('โหลดแผนที่ร้านไม่ได้ กรุณาลองใหม่'))
  }, [access.loading, access.error])

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const map = L.map(mapDivRef.current, { zoomControl: false }).setView(PLAYER_MAP_CENTER, 17)
    L.tileLayer(CARTO_VOYAGER_TILE_URL, CARTO_TILE_OPTIONS).addTo(map)
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer || !data) return

    layer.clearLayers()
    const points: L.LatLngExpression[] = []

    data.shops.forEach((shop) => {
      const variant = shopMarkerVariant(shop.id, data.current_shop_id)
      L.marker([shop.lat, shop.lng], { icon: shopIcon(variant) })
        .bindPopup(variant === 'own' ? `ร้านของฉัน: ${shop.name}` : `ร้านใน Host: ${shop.name}`)
        .addTo(layer)
      points.push([shop.lat, shop.lng])
    })

    visibleCampaigns(data.campaigns, selected).forEach((campaign) => {
      const color = campaignColor(data.campaigns, campaign.id)
      const coordinates: L.LatLngExpression[] = []
      campaign.portals.forEach((portal) => {
        L.marker([portal.lat, portal.lng], { icon: treasureIcon(PORTAL_TIER) })
          .bindPopup(`${portal.name} • ${portal.coin_reward} เหรียญ`)
          .addTo(layer)
        L.circle([portal.lat, portal.lng], {
          radius: portal.radius_m ?? 0,
          color: TIER_COLORS[PORTAL_TIER],
          fillColor: TIER_COLORS[PORTAL_TIER],
          fillOpacity: 0.08,
          weight: 1.5,
        }).addTo(layer)
        coordinates.push([portal.lat, portal.lng])
        points.push([portal.lat, portal.lng])
      })
      if (coordinates.length > 1) L.polyline(coordinates, { color, weight: 4 }).addTo(layer)
    })

    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 16 })
  }, [data, selected])

  const blockingMessage = access.error || error
  const showSpinner = !blockingMessage && (access.loading || !data)

  const ownShop = data?.shops.find((shop) => shop.id === data.current_shop_id)
  const selectedCampaign = data?.campaigns.find((campaign) => campaign.id === selected) ?? null
  const visiblePortals = data ? visibleCampaigns(data.campaigns, selected).flatMap((campaign) => campaign.portals) : []
  const sheetPortals: ShopMapSheetPortal[] = visiblePortals.map((portal) => ({
    id: portal.id, name: portal.name, sequence: portal.sequence, coin_reward: portal.coin_reward,
  }))
  const hasCoordinates = Boolean(data && (data.shops.length || data.campaigns.some((campaign) => campaign.portals.length)))

  const panTo = (portal: ShopMapSheetPortal) => {
    const found = visiblePortals.find((p) => p.id === portal.id)
    if (found) mapRef.current?.panTo([found.lat, found.lng])
  }

  return (
    <div style={S.page}>
      {/* The map div stays mounted across every render (even before `data` loads) so the leaflet
          instance is created exactly once — creating it lazily behind a loading gate would leave
          later data updates with nowhere to attach the map. */}
      <div ref={mapDivRef} style={S.map} />

      {data && !blockingMessage && (
        <>
          <div style={S.topHud}>
            <div style={S.shopNameCard}>{ownShop?.name ?? ''}</div>
            <Chip style={S.hostChip}>{data.host.name}</Chip>
          </div>

          {data.campaigns.length > 1 && (
            <div style={S.campaignRow}>
              {data.campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelected(campaign.id)}
                  style={{ ...S.campaignChip, ...(selected === campaign.id ? S.campaignChipActive : {}) }}
                >
                  {campaign.title}
                </button>
              ))}
            </div>
          )}

          {!hasCoordinates && <div style={S.emptyOverlay}><Empty text="ยังไม่มีพิกัดร้านหรือจุดกิจกรรม" /></div>}

          <ShopMapSheet
            state={sheetState}
            onStateChange={setSheetState}
            onHeightChange={() => {}}
            campaignTitle={selectedCampaign?.title ?? null}
            portals={sheetPortals}
            shopCount={data.shops.length}
            onPanTo={panTo}
          />
        </>
      )}

      {showSpinner && <div style={S.emptyOverlay}><Spinner /></div>}
      {blockingMessage && <div style={S.emptyOverlay}><p>{blockingMessage}</p></div>}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { position: 'fixed', inset: 0, background: 'var(--background-secondary)', overflow: 'hidden' },
  map: { position: 'fixed', inset: 0 },
  topHud: {
    position: 'absolute',
    top: 'calc(10px + env(safe-area-inset-top))',
    left: 14,
    right: 14,
    zIndex: 800,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  shopNameCard: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '10px 16px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontWeight: 800,
    fontSize: 'var(--body2-size)',
    boxShadow: 'var(--shadow-md)',
  },
  hostChip: { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)', flexShrink: 0 },
  campaignRow: {
    position: 'absolute',
    top: 'calc(60px + env(safe-area-inset-top))',
    left: 14,
    right: 14,
    zIndex: 800,
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  campaignChip: {
    flex: '0 0 auto',
    minHeight: 38,
    padding: '8px 14px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
    boxShadow: 'var(--shadow-sm)',
  },
  campaignChipActive: { borderColor: 'var(--primary)', color: 'var(--text-primary)' },
  emptyOverlay: { position: 'absolute', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background-secondary)' },
}
