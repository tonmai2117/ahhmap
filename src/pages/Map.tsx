import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import '../leafletGlobal'
import 'leaflet-routing-machine'
import { api } from '../api'
import { CoinIcon } from '../components/CoinIcon'
import { Icon } from '../components/Icon'
import { LineProfileCard, type LineProfile } from '../components/LineProfileCard'
import { MapBottomSheet } from '../components/MapBottomSheet'
import { Chip, Toast, useToast } from '../components/ui'
import { useGeolocation } from '../hooks/useGeolocation'
import { AR_HIDE_SEEK_CONTENT, arHideSeekBaseUrl, buildArHideSeekDemoUrl, collectThenOpenArHideSeek, demoLaunchForTreasure, regularArPath, type DemoLaunch } from '../externalGame'
import { getProfile, openExternalWindow } from '../liff'
import { treasureIcon } from '../map/mapIcons'
import {
  TIER_COLORS,
  getTier,
  haversine,
  orderByNearestNeighbor,
  type MapMode,
  type MapPosition,
} from '../map/mapDomain'
import type { Treasure } from '../types'
import { userFacingError } from '../utils/errors'
import { CARTO_TILE_OPTIONS, CARTO_VOYAGER_TILE_URL, PLAYER_MAP_CENTER } from '../utils/mapDefaults'
import { mapRegistrationPath } from './mapRegistration'

type ApiStatusError = { status?: number }
type RoutingControlWithWaypoints = L.Routing.Control & {
  spliceWaypoints: (index: number, waypointsToRemove: number, ...waypoints: L.LatLng[]) => void
}
type RoutingControlOptionsWithMarker = L.Routing.RoutingControlOptions & {
  createMarker: () => null
  addWaypoints: boolean
  draggableWaypoints: boolean
  show: boolean
  routeWhileDragging: boolean
}
type RoutingNamespace = {
  control: (options: RoutingControlOptionsWithMarker) => L.Routing.Control
  osrmv1: (options: { serviceUrl: string }) => L.Routing.IRouter
}

function hasStatus(value: unknown): value is ApiStatusError {
  return typeof value === 'object' && value !== null && 'status' in value
}

function hasRouting(leaflet: typeof L): leaflet is typeof L & { Routing: RoutingNamespace } {
  return 'Routing' in leaflet
}

function playerIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:52px;height:52px">
        <span style="position:absolute;inset:0;border-radius:50%;background:rgba(239,81,40,.35);animation:aahh-radar 2.4s ease-out infinite"></span>
        <span style="position:absolute;inset:0;border-radius:50%;background:rgba(239,81,40,.25);animation:aahh-radar 2.4s ease-out 1.2s infinite"></span>
        <span style="position:absolute;left:17px;top:17px;width:18px;height:18px;border-radius:50%;background:#ef5128;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>
      </div>
    `,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  })
}

export default function Map() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { toast, showToast } = useToast()
  const campaignSlug = searchParams.get('campaign')
  const hostSlug = searchParams.get('host')

  const [balance, setBalance] = useState<number | null>(null)
  const [playerName, setPlayerName] = useState('ผู้เล่น')
  const [profile, setProfile] = useState<LineProfile>(null)
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [inRangeTreasures, setInRangeTreasures] = useState<Treasure[]>([])
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [mapMode, setMapMode] = useState<MapMode>('daily')
  const [displayPos, setDisplayPos] = useState<MapPosition | null>(null)
  const [sheetState, setSheetState] = useState<'expanded' | 'collapsed'>('expanded')
  const [sheetHeight, setSheetHeight] = useState(260)
  const [routeNonce, setRouteNonce] = useState(0)
  const [demoLaunch, setDemoLaunch] = useState<DemoLaunch | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircRef = useRef<L.Circle | null>(null)
  const treasureLayerRef = useRef<L.LayerGroup | null>(null)
  const userPannedRef = useRef(false)
  const routeControlRef = useRef<L.Routing.Control | null>(null)
  const routeOriginRef = useRef<MapPosition | null>(null)
  const displayPosRef = useRef<MapPosition | null>(null)
  const displayPosTimeRef = useRef(0)
  const portalBusyRef = useRef(false)

  const posRef = useRef<MapPosition | null>(null)
  const treasuresRef = useRef<Treasure[]>([])
  const mapModeRef = useRef<MapMode>('daily')
  treasuresRef.current = treasures
  mapModeRef.current = mapMode

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const map = L.map(mapDivRef.current, { zoomControl: false }).setView(PLAYER_MAP_CENTER, 17)
    L.tileLayer(CARTO_VOYAGER_TILE_URL, CARTO_TILE_OPTIONS).addTo(map)

    const layer = L.layerGroup().addTo(map)
    treasureLayerRef.current = layer
    mapRef.current = map

    map.on('dragstart', () => { userPannedRef.current = true })

    return () => {
      if (routeControlRef.current) {
        map.removeControl(routeControlRef.current)
        routeControlRef.current = null
      }
      map.remove()
      mapRef.current = null
      treasureLayerRef.current = null
      playerMarkerRef.current = null
      accuracyCircRef.current = null
    }
  }, [])

  useEffect(() => {
    let active = true
    getProfile().then((nextProfile) => {
      if (active) setProfile(nextProfile)
    }).catch(() => {
      // Profile display is decorative; keep the map usable if LIFF profile lookup fails.
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    api.get<{ coin_balance: number; user?: { display_name?: string } }>('/me')
      .then((r) => {
        setBalance(r.coin_balance)
        if (r.user?.display_name) setPlayerName(r.user.display_name)
      })
      .catch((err: unknown) => {
        if (hasStatus(err) && (err.status === 404 || err.status === 409)) {
          navigate(mapRegistrationPath(location.pathname, location.search), { replace: true })
        }
        else showToast(userFacingError(err, 'โหลดข้อมูลผู้เล่นไม่ได้ กรุณาลองใหม่'))
      })
  }, [location.pathname, location.search, navigate, showToast])

  useEffect(() => {
    let active = true
    const query = new URLSearchParams()
    if (campaignSlug) query.set('campaign', campaignSlug)
    if (campaignSlug && hostSlug) query.set('host', hostSlug)
    const path = campaignSlug ? `/treasures?${query.toString()}` : '/treasures'

    api.get<{ treasures: Treasure[] }>(path)
      .then((r) => {
        if (active) setTreasures(r.treasures)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (campaignSlug && hasStatus(err) && (err.status === 404 || err.status === 409)) {
          showToast('ไม่พบกิจกรรมนี้ กำลังกลับไปยังแผนที่หลัก')
          navigate('/map', { replace: true })
        } else {
          showToast(userFacingError(err, 'โหลดจุดสมบัติไม่ได้ กรุณาลองใหม่'))
        }
      })
    return () => { active = false }
  }, [campaignSlug, hostSlug, navigate, showToast])

  useEffect(() => {
    const layer = treasureLayerRef.current
    if (!layer) return

    layer.clearLayers()
    treasures.forEach((t) => {
      const tier = getTier(t)
      L.marker([t.lat, t.lng], { icon: treasureIcon(tier) })
        .bindPopup(`<b>${t.name}</b><br>รางวัล: <b>${t.coin_reward}</b> เหรียญ`)
        .addTo(layer)

      L.circle([t.lat, t.lng], {
        radius: t.radius_m,
        color: TIER_COLORS[tier],
        fillColor: TIER_COLORS[tier],
        fillOpacity: 0.08,
        weight: 1.5,
      }).addTo(layer)
    })
  }, [treasures])

  const checkProximity = useCallback((pos: MapPosition, trs: Treasure[]) => {
    const inRange = trs
      .filter(t => haversine(pos.lat, pos.lng, t.lat, t.lng) <= t.radius_m + 25)
      .sort(
        (a, b) =>
          haversine(pos.lat, pos.lng, a.lat, a.lng) -
          haversine(pos.lat, pos.lng, b.lat, b.lng),
      )
    setInRangeTreasures(inRange)
    setSelectedPortalId((current) => (
      current && inRange.some((t) => t.id === current) ? current : (inRange[0]?.id ?? null)
    ))
  }, [])

  const selectPortal = useCallback((treasure: Treasure) => {
    setSelectedPortalId(treasure.id)
  }, [])

  const nearbyTreasure = useMemo(
    () => inRangeTreasures.find((t) => t.id === selectedPortalId) ?? inRangeTreasures[0] ?? null,
    [inRangeTreasures, selectedPortalId],
  )

  const handleMapPosition = useCallback((p: MapPosition) => {
    posRef.current = p
    setGeoError(false)

    const previousDisplay = displayPosRef.current
    const now = Date.now()
    if (
      !previousDisplay ||
      haversine(previousDisplay.lat, previousDisplay.lng, p.lat, p.lng) > 10 ||
      now - displayPosTimeRef.current > 2000
    ) {
      displayPosRef.current = p
      displayPosTimeRef.current = now
      setDisplayPos(p)
    }

    const map = mapRef.current
    if (map) {
      if (!playerMarkerRef.current) {
        playerMarkerRef.current = L.marker([p.lat, p.lng], { icon: playerIcon() }).addTo(map)
      } else {
        playerMarkerRef.current.setLatLng([p.lat, p.lng])
      }

      if (!accuracyCircRef.current) {
        accuracyCircRef.current = L.circle([p.lat, p.lng], {
          radius: p.accuracy,
          color: '#ef5128',
          fillColor: '#ef5128',
          fillOpacity: 0.06,
          weight: 1,
        }).addTo(map)
      } else {
        accuracyCircRef.current.setLatLng([p.lat, p.lng])
        accuracyCircRef.current.setRadius(p.accuracy)
      }

      if (!userPannedRef.current) map.panTo([p.lat, p.lng])
    }

    if (mapModeRef.current === 'event' && routeControlRef.current && routeOriginRef.current) {
      if (haversine(routeOriginRef.current.lat, routeOriginRef.current.lng, p.lat, p.lng) > 30) {
        ;(routeControlRef.current as RoutingControlWithWaypoints).spliceWaypoints(0, 1, L.latLng(p.lat, p.lng))
        routeOriginRef.current = p
      }
    } else if (mapModeRef.current === 'event' && !routeControlRef.current) {
      setRouteNonce((n) => n + 1)
    }

    checkProximity(p, treasuresRef.current)
  }, [checkProximity])

  useGeolocation({
    watch: true,
    options: { enableHighAccuracy: true, maximumAge: 3_000 },
    onPosition: handleMapPosition,
    onError: () => setGeoError(true),
  })

  useEffect(() => {
    if (posRef.current) checkProximity(posRef.current, treasures)
  }, [treasures, checkProximity])

  useEffect(() => {
    const map = mapRef.current
    const pos = posRef.current
    if (!map) return

    if (routeControlRef.current) {
      map.removeControl(routeControlRef.current)
      routeControlRef.current = null
      routeOriginRef.current = null
    }

    if (mapMode !== 'event' || !pos || treasures.length === 0) return
    if (!hasRouting(L)) {
      showToast('คำนวณเส้นทางไม่ได้')
      return
    }

    const ordered = orderByNearestNeighbor(treasures, pos)
    const control = L.Routing.control({
      waypoints: [L.latLng(pos.lat, pos.lng), ...ordered.map((t) => L.latLng(t.lat, t.lng))],
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
      lineOptions: {
        styles: [
          { color: '#ffffff', weight: 8, opacity: 0.95 },
          { color: '#ef5128', weight: 4, opacity: 1 },
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 5,
      },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      fitSelectedRoutes: true,
      routeWhileDragging: false,
    }).addTo(map) as L.Routing.Control

    control.on('routingerror', () => showToast('คำนวณเส้นทางไม่ได้'))
    routeControlRef.current = control
    routeOriginRef.current = pos

    return () => {
      if (routeControlRef.current === control && mapRef.current) {
        mapRef.current.removeControl(control)
        routeControlRef.current = null
        routeOriginRef.current = null
      }
    }
  }, [mapMode, treasures, routeNonce, showToast])

  const routeTreasures = useMemo(() => {
    if (!displayPos) return treasures
    return mapMode === 'event'
      ? orderByNearestNeighbor(treasures, displayPos)
      : [...treasures].sort((a, b) => haversine(displayPos.lat, displayPos.lng, a.lat, a.lng) - haversine(displayPos.lat, displayPos.lng, b.lat, b.lng))
  }, [displayPos, mapMode, treasures])

  const nearbyCount = useMemo(() => {
    if (!displayPos) return treasures.length
    return treasures.filter((t) => haversine(displayPos.lat, displayPos.lng, t.lat, t.lng) <= 500).length
  }, [displayPos, treasures])

  const recenter = () => {
    const p = posRef.current
    if (p && mapRef.current) {
      mapRef.current.panTo([p.lat, p.lng])
      userPannedRef.current = false
    }
  }

  const panToTreasure = (t: Treasure) => {
    mapRef.current?.panTo([t.lat, t.lng])
    userPannedRef.current = true
  }

  const goToAR = async () => {
    const p = posRef.current
    if (!nearbyTreasure || !p) return
    if (nearbyTreasure.ar_content !== AR_HIDE_SEEK_CONTENT) {
      navigate(regularArPath({
        id: nearbyTreasure.id,
        lat: p.lat,
        lng: p.lng,
        arContent: nearbyTreasure.ar_content,
        name: nearbyTreasure.name,
      }))
      return
    }

    const baseUrl = arHideSeekBaseUrl()
    if (!baseUrl) {
      showToast('ตั้งค่าเกม AR Hide & Seek ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล')
      return
    }
    if (portalBusyRef.current) return

    portalBusyRef.current = true
    setPortalBusy(true)
    let collectedUrl: string | null = null
    try {
      await collectThenOpenArHideSeek({
        baseUrl,
        treasure: nearbyTreasure.name,
        collect: () => api.post<{ collected: true; coins_earned: number }>(
          `/treasures/${nearbyTreasure.id}/collect`, { lat: p.lat, lng: p.lng },
        ),
        onCollected: (url, result) => {
          collectedUrl = url
          setDemoLaunch({ treasureId: nearbyTreasure.id, claim: 'earned', url })
          setBalance((current) => current === null ? current : current + result.coins_earned)
        },
        open: openExternalWindow,
      })
      showToast('บันทึกรางวัลแล้ว')
    } catch (err) {
      if (collectedUrl) {
        showToast('บันทึกรางวัลแล้ว แต่เปิดเกมไม่สำเร็จ กรุณากดเปิดเกมอีกครั้ง')
      } else if (hasStatus(err) && err.status === 409) {
        const url = buildArHideSeekDemoUrl(baseUrl, {
          claim: 'already', reward: 0, treasure: nearbyTreasure.name,
        })
        setDemoLaunch({ treasureId: nearbyTreasure.id, claim: 'already', url })
        showToast('เก็บ portal นี้แล้ววันนี้')
      } else if (hasStatus(err) && err.status === 403) {
        showToast('คุณอยู่นอกระยะของ portal นี้')
      } else {
        showToast(userFacingError(err, 'บันทึกรางวัลไม่สำเร็จ กรุณาลองใหม่'))
      }
    } finally {
      portalBusyRef.current = false
      setPortalBusy(false)
    }
  }

  const currentDemoLaunch = demoLaunchForTreasure(demoLaunch, nearbyTreasure?.id ?? null)

  const openDemo = (url: string) => {
    try {
      openExternalWindow(url)
    } catch {
      showToast('ไม่สามารถเปิดเกมได้ กรุณาลองใหม่')
    }
  }

  return (
    <div style={S.page}>
      <div ref={mapDivRef} style={S.map} />

      <div style={S.topHud}>
        <div style={S.playerCard}>
          <LineProfileCard
            profile={profile ?? (playerName ? { displayName: playerName } : null)}
            variant="compact"
            showBadge={false}
            style={S.playerCardStyle}
          />
        </div>
        <Chip style={S.coinPill}>
          <CoinIcon size={20} />
          {balance ?? '—'}
        </Chip>
      </div>

      {campaignSlug && (
        <div style={S.campaignBanner}>
          <button
            type="button"
            style={S.campaignBack}
            onClick={() => navigate(
              hostSlug
                ? `/hosts/${encodeURIComponent(hostSlug)}/campaigns/${encodeURIComponent(campaignSlug)}`
                : '/host',
            )}
            aria-label="กลับไปหน้ากิจกรรม"
          >
            <Icon name="back" size={19} />
          </button>
          <span style={S.campaignBannerText}>แผนที่กิจกรรม</span>
        </div>
      )}

      <div style={{ ...S.missionRow, ...(campaignSlug ? S.missionRowCampaign : {}) }}>
        <button type="button" onClick={() => setMapMode('daily')} style={{ ...S.missionChip, ...(mapMode === 'daily' ? S.missionActive : {}) }}>
          <Icon name="pin" size={16} />
          <span>Portal ใกล้คุณ</span>
          <b style={{ color: 'var(--primary)' }}>{nearbyCount} จุด</b>
        </button>
        <button type="button" onClick={() => setMapMode('event')} style={{ ...S.missionChip, ...(mapMode === 'event' ? S.missionActive : {}) }}>
          <Icon name="list" size={16} />
          <span>ภารกิจ Event: Portal Route</span>
          <b style={{ color: '#8556e3' }}>{treasures.length} จุด</b>
        </button>
      </div>

      <button
        onClick={recenter}
        style={{
          ...S.recenterBtn,
          bottom: sheetState === 'expanded' ? sheetHeight + 14 : 78,
        }}
        title="กลับตำแหน่งฉัน"
      >
        <Icon name="recenter" size={22} />
      </button>

      <MapBottomSheet
        state={sheetState}
        onStateChange={setSheetState}
        onHeightChange={setSheetHeight}
        mode={mapMode}
        treasures={routeTreasures}
        nearbyCount={nearbyCount}
        pos={displayPos}
        nearbyTreasure={nearbyTreasure}
        inRangeTreasures={inRangeTreasures}
        selectedPortalId={selectedPortalId}
        onSelectPortal={selectPortal}
        onPanTo={panToTreasure}
        onGoToAR={goToAR}
        demoLaunch={currentDemoLaunch}
        onOpenDemo={openDemo}
        portalBusy={portalBusy}
      />

      {geoError && (
        <Toast
          persist
          message={'ไม่สามารถระบุตำแหน่งได้\nเปิด Location ใน Settings → LINE → Location แล้วโหลดใหม่'}
        />
      )}
      {toast}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    background: 'var(--background-secondary)',
    overflow: 'hidden',
  },
  map: {
    position: 'fixed',
    inset: 0,
  },
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
    pointerEvents: 'none',
  },
  playerCard: {
    flex: '0 1 auto',
    minWidth: 0,
    pointerEvents: 'auto',
  },
  playerCardStyle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
    background: 'var(--surface)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-md)',
    width: 'auto',
    boxSizing: 'border-box',
    padding: '0px 16px 0px 0px',
  },
  coinPill: {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-md)',
  },
  missionRow: {
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
  missionRowCampaign: {
    top: 'calc(112px + env(safe-area-inset-top))',
  },
  campaignBanner: {
    position: 'absolute',
    top: 'calc(60px + env(safe-area-inset-top))',
    left: 14,
    right: 14,
    zIndex: 801,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px 6px 7px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow-md)',
  },
  campaignBack: {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-full)',
    background: 'var(--fill-subtle)',
    color: 'var(--text-primary)',
  },
  campaignBannerText: {
    overflow: 'hidden',
    color: 'var(--text-primary)',
    fontSize: 'var(--body2-size)',
    fontWeight: 800,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  missionChip: {
    minHeight: 42,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    flex: '0 0 auto',
    padding: '8px 12px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
    boxShadow: 'var(--shadow-sm)',
  },
  missionActive: {
    borderColor: 'var(--primary)',
    color: 'var(--text-primary)',
  },
  recenterBtn: {
    position: 'absolute',
    right: 14,
    zIndex: 800,
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'bottom .3s var(--ease-standard)',
  },
}
