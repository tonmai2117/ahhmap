import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import '../leafletGlobal'
import { api } from '../api'
import { CoinIcon } from '../components/CoinIcon'
import { Icon } from '../components/Icon'
import { LineProfileCard, type LineProfile } from '../components/LineProfileCard'
import { MapBottomSheet } from '../components/MapBottomSheet'
import { NavigationPanel } from '../components/NavigationPanel'
import { WeatherStatus } from '../components/WeatherStatus'
import { WeatherDemoControls } from '../components/WeatherDemoControls'
import { Chip, Toast, useToast } from '../components/ui'
import { useGeolocation } from '../hooks/useGeolocation'
import { useMapTheme } from '../hooks/useMapTheme'
import { useWeather } from '../hooks/useWeather'
import { WeatherMarkerManager } from '../map/weatherMarker'
import { AR_HIDE_SEEK_CONTENT, arHideSeekBaseUrl, buildArHideSeekDemoUrl, collectThenOpenArHideSeek, demoLaunchForTreasure, regularArPath, type DemoLaunch } from '../externalGame'
import { getProfile, openExternalWindow } from '../liff'
import { treasureIcon } from '../map/mapIcons'
import { DEMO_DESTINATIONS } from '../map/demoDestinations'
import {
  TIER_COLORS,
  getTier,
  haversine,
  orderByNearestNeighbor,
  type MapMode,
  type MapPosition,
} from '../map/mapDomain'
import { routeProgress, type Destination, type FetchStatus, type NavigationPhase, type RouteResult, type TravelMode } from '../map/navigationDomain'
import { fetchRoute, routingErrorMessage } from '../map/routingClient'
import type { Treasure } from '../types'
import { userFacingError } from '../utils/errors'
import { CARTO_DARK_TILE_URL, CARTO_TILE_OPTIONS, CARTO_VOYAGER_TILE_URL, PLAYER_MAP_CENTER } from '../utils/mapDefaults'
import { mapRegistrationPath } from './mapRegistration'

type ApiStatusError = { status?: number }

function hasStatus(value: unknown): value is ApiStatusError {
  return typeof value === 'object' && value !== null && 'status' in value
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

function destinationIcon() {
  return L.divIcon({
    html: '<div class="aahh-destination-pin"><span></span></div>',
    className: '',
    iconSize: [34, 42],
    iconAnchor: [17, 40],
  })
}

export default function Map() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { toast, showToast } = useToast()
  const { theme, setTheme } = useMapTheme()
  const campaignSlug = searchParams.get('campaign')
  const hostSlug = searchParams.get('host')
  const isDemo = searchParams.get('demo') === '1'

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
  const [demoLaunch, setDemoLaunch] = useState<DemoLaunch | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [travelMode, setTravelMode] = useState<TravelMode>('walking')
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('idle')
  const [routeStatus, setRouteStatus] = useState<FetchStatus>('idle')
  const [routeError, setRouteError] = useState('')
  const [destination, setDestination] = useState<Destination | null>(null)
  const [navigationRoute, setNavigationRoute] = useState<RouteResult | null>(null)
  const [eventRoute, setEventRoute] = useState<RouteResult | null>(null)
  const [remainingM, setRemainingM] = useState<number | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const weatherQueryParam = searchParams.get('weather')
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(displayPos, weatherQueryParam, isDemo)
  const weatherMarkerRef = useRef<WeatherMarkerManager | null>(null)

  useEffect(() => {
    if (!weatherMarkerRef.current) {
      weatherMarkerRef.current = new WeatherMarkerManager()
    }
    if (mapRef.current) {
      weatherMarkerRef.current.update(mapRef.current, weather, displayPos)
    }
    return () => {
      weatherMarkerRef.current?.remove()
    }
  }, [weather, displayPos])

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const playerMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircRef = useRef<L.Circle | null>(null)
  const treasureLayerRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const rainRadarLayerRef = useRef<L.TileLayer | null>(null)
  const routeLayersRef = useRef<L.Polyline[]>([])
  const destinationMarkerRef = useRef<L.Marker | null>(null)
  const userPannedRef = useRef(false)
  const routeOriginRef = useRef<MapPosition | null>(null)
  const displayPosRef = useRef<MapPosition | null>(null)
  const displayPosTimeRef = useRef(0)
  const portalBusyRef = useRef(false)
  const routeAbortRef = useRef<AbortController | null>(null)
  const routeRequestIdRef = useRef(0)
  const pickingDestinationRef = useRef(false)
  const mapDraggedRef = useRef(false)
  const sourcePositionRef = useRef<MapPosition | null>(null)
  const lastRerouteAtRef = useRef(0)

  const posRef = useRef<MapPosition | null>(null)
  const treasuresRef = useRef<Treasure[]>([])
  treasuresRef.current = treasures

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return

    const map = L.map(mapDivRef.current, { zoomControl: false }).setView(PLAYER_MAP_CENTER, 17)
    tileLayerRef.current = L.tileLayer(theme === 'dark' ? CARTO_DARK_TILE_URL : CARTO_VOYAGER_TILE_URL, CARTO_TILE_OPTIONS).addTo(map)

    const rainPane = map.createPane('aahh-rain-radar')
    rainPane.style.zIndex = '240'
    rainPane.style.pointerEvents = 'none'
    rainRadarLayerRef.current = L.tileLayer('/api/weather-tile?z={z}&x={x}&y={y}', {
      pane: 'aahh-rain-radar',
      opacity: 0.58,
      maxZoom: 18,
      attribution: 'Rain radar &copy; OpenWeather',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    treasureLayerRef.current = layer
    mapRef.current = map

    map.on('dragstart', () => {
      userPannedRef.current = true
      mapDraggedRef.current = true
    })
    map.on('click', (event) => {
      if (!pickingDestinationRef.current) return
      if (mapDraggedRef.current) {
        mapDraggedRef.current = false
        return
      }
      const next: Destination = {
        id: `map-${event.latlng.lat.toFixed(5)}-${event.latlng.lng.toFixed(5)}`,
        name: 'จุดที่เลือกบนแผนที่',
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        source: 'map',
      }
      pickingDestinationRef.current = false
      setDestination(next)
      setNavigationPhase('preview')
      setRouteStatus('idle')
      setNavigationRoute(null)
      setSheetState('expanded')
    })

    return () => {
      routeAbortRef.current?.abort()
      map.remove()
      mapRef.current = null
      treasureLayerRef.current = null
      playerMarkerRef.current = null
      accuracyCircRef.current = null
      tileLayerRef.current = null
      rainRadarLayerRef.current = null
      routeLayersRef.current = []
      destinationMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    tileLayerRef.current?.setUrl(theme === 'dark' ? CARTO_DARK_TILE_URL : CARTO_VOYAGER_TILE_URL)
  }, [theme])

  useEffect(() => {
    const attributionCorner = mapRef.current
      ?.getContainer()
      .querySelector<HTMLElement>('.leaflet-bottom.leaflet-right')
    if (!attributionCorner) return
    attributionCorner.style.bottom = `${sheetState === 'expanded' ? sheetHeight + 6 : 70}px`
    attributionCorner.style.transition = 'bottom .3s var(--ease-standard)'
  }, [sheetHeight, sheetState])

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

    checkProximity(p, treasuresRef.current)
  }, [checkProximity])

  const handleSourcePosition = useCallback((p: MapPosition) => {
    sourcePositionRef.current = p
    handleMapPosition(p)
  }, [handleMapPosition])

  useGeolocation({
    watch: true,
    options: { enableHighAccuracy: true, maximumAge: 3_000, timeout: 15_000 },
    onPosition: handleSourcePosition,
    onError: () => setGeoError(true),
  })

  useEffect(() => {
    if (posRef.current) checkProximity(posRef.current, treasures)
  }, [treasures, checkProximity])

  useEffect(() => {
    const pos = posRef.current
    if (navigationOpen || mapMode !== 'event' || !pos || treasures.length === 0) {
      setEventRoute(null)
      return
    }
    const controller = new AbortController()
    const ordered = orderByNearestNeighbor(treasures, pos)
    fetchRoute([pos, ...ordered], travelMode, controller.signal)
      .then(setEventRoute)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) showToast(routingErrorMessage(error))
      })
    return () => controller.abort()
  }, [mapMode, navigationOpen, treasures, travelMode, showToast])

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

  const visibleRoute = navigationOpen ? navigationRoute : eventRoute

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    routeLayersRef.current.forEach((layer) => layer.removeFrom(map))
    routeLayersRef.current = []
    if (!visibleRoute?.geometry.length) return
    const latLngs = visibleRoute.geometry.map(([lng, lat]) => L.latLng(lat, lng))
    const outline = L.polyline(latLngs, { color: theme === 'dark' ? '#121416' : '#ffffff', weight: 8, opacity: 0.92 }).addTo(map)
    const line = L.polyline(latLngs, { color: '#ef5128', weight: 4, opacity: 1 }).addTo(map)
    routeLayersRef.current = [outline, line]
    return () => {
      outline.removeFrom(map)
      line.removeFrom(map)
      routeLayersRef.current = routeLayersRef.current.filter((layer) => layer !== outline && layer !== line)
    }
  }, [visibleRoute, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    destinationMarkerRef.current?.removeFrom(map)
    destinationMarkerRef.current = null
    if (destination) {
      destinationMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destinationIcon() })
        .bindTooltip(destination.name, { direction: 'top' })
        .addTo(map)
    }
    return () => {
      destinationMarkerRef.current?.removeFrom(map)
      destinationMarkerRef.current = null
    }
  }, [destination])

  const chooseDestination = useCallback((next: Destination) => {
    routeAbortRef.current?.abort()
    pickingDestinationRef.current = false
    setNavigationOpen(true)
    setDestination(next)
    setNavigationRoute(null)
    setRouteStatus('idle')
    setRouteError('')
    setNavigationPhase('preview')
    setRemainingM(null)
    setCurrentStepIndex(0)
    setSheetState('expanded')
    mapRef.current?.panTo([next.lat, next.lng])
  }, [])

  const calculateNavigationRoute = useCallback(async (mode: TravelMode = travelMode, continueNavigation = false) => {
    const origin = posRef.current
    if (!origin || !destination) return
    routeAbortRef.current?.abort()
    const controller = new AbortController()
    routeAbortRef.current = controller
    const requestId = ++routeRequestIdRef.current
    setRouteStatus('loading')
    setRouteError('')
    setNavigationRoute(null)
    routeOriginRef.current = { ...origin }
    try {
      const result = await fetchRoute([origin, destination], mode, controller.signal)
      if (requestId !== routeRequestIdRef.current) return
      setNavigationRoute(result)
      setRouteStatus('ready')
      setNavigationPhase(continueNavigation ? 'navigating' : 'preview')
      setRemainingM(result.distanceM)
      setCurrentStepIndex(0)
      const bounds = L.latLngBounds(result.geometry.map(([lng, lat]) => [lat, lng] as [number, number]))
      mapRef.current?.fitBounds(bounds, { paddingTopLeft: [28, 130], paddingBottomRight: [28, Math.min(sheetHeight + 30, 390)] })
    } catch (error) {
      if (requestId !== routeRequestIdRef.current || (error instanceof DOMException && error.name === 'AbortError')) return
      setRouteStatus('error')
      setRouteError(routingErrorMessage(error))
    }
  }, [destination, sheetHeight, travelMode])

  useEffect(() => {
    if (navigationPhase !== 'navigating' || routeStatus !== 'ready' || !displayPos || !routeOriginRef.current) return
    const now = Date.now()
    if (haversine(routeOriginRef.current.lat, routeOriginRef.current.lng, displayPos.lat, displayPos.lng) < 30) return
    if (now - lastRerouteAtRef.current < 15_000) return
    lastRerouteAtRef.current = now
    void calculateNavigationRoute(travelMode, true)
  }, [calculateNavigationRoute, displayPos, navigationPhase, routeStatus, travelMode])

  const changeTravelMode = useCallback((mode: TravelMode) => {
    setTravelMode(mode)
    if (navigationRoute && destination) void calculateNavigationRoute(mode)
  }, [calculateNavigationRoute, destination, navigationRoute])

  const cancelNavigation = useCallback(() => {
    routeAbortRef.current?.abort()
    routeRequestIdRef.current += 1
    pickingDestinationRef.current = false
    setNavigationOpen(false)
    setNavigationPhase('idle')
    setRouteStatus('idle')
    setRouteError('')
    setDestination(null)
    setNavigationRoute(null)
    setRemainingM(null)
    setCurrentStepIndex(0)
    const source = sourcePositionRef.current
    if (source) handleMapPosition(source)
  }, [handleMapPosition])

  useEffect(() => {
    if (navigationPhase !== 'navigating' || !navigationRoute || !displayPos || displayPos.accuracy > 50) return
    const progress = routeProgress(navigationRoute.geometry, displayPos)
    setRemainingM(progress.remainingM)
    let covered = 0
    let stepIndex = 0
    for (let i = 0; i < navigationRoute.steps.length; i += 1) {
      covered += navigationRoute.steps[i].distanceM
      if (progress.traveledM <= covered) { stepIndex = i; break }
    }
    setCurrentStepIndex(stepIndex)
    const endpoint = navigationRoute.geometry[navigationRoute.geometry.length - 1]
    if (endpoint && progress.ratio >= 0.9 && haversine(displayPos.lat, displayPos.lng, endpoint[1], endpoint[0]) <= 25) {
      setNavigationPhase('arrived')
      setRemainingM(0)
      setCurrentStepIndex(Math.max(0, navigationRoute.steps.length - 1))
    }
  }, [displayPos, navigationPhase, navigationRoute])

  const recenter = () => {
    const p = posRef.current
    if (p && mapRef.current) {
      mapRef.current.panTo([p.lat, p.lng])
      userPannedRef.current = false
    }
  }

  const showBangkokRainRadar = () => {
    mapRef.current?.fitBounds(
      [[13.45, 100.25], [14.05, 100.95]],
      { padding: [18, 18] },
    )
    userPannedRef.current = true
    setSheetState('collapsed')
  }

  const panToTreasure = (t: Treasure) => {
    mapRef.current?.panTo([t.lat, t.lng])
    userPannedRef.current = true
  }

  const beginMapPick = () => {
    pickingDestinationRef.current = true
    mapDraggedRef.current = false
    setNavigationPhase('selecting')
    setDestination(null)
    setNavigationRoute(null)
    setRouteStatus('idle')
    setSheetState('collapsed')
  }

  const startNavigation = () => {
    if (!navigationRoute) return
    setNavigationPhase('navigating')
    setRemainingM(navigationRoute.distanceM)
    setCurrentStepIndex(0)
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

      {isDemo && (
        <div style={{ ...S.demoBadge, top: campaignSlug ? 'calc(164px + env(safe-area-inset-top))' : 'calc(112px + env(safe-area-inset-top))' }}>
          โหมดทดสอบ • GPS เรียลไทม์
        </div>
      )}

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
        navigationOpen={navigationOpen}
        onNavigateTo={(treasure) => chooseDestination({
          id: `portal-${treasure.id}`,
          name: treasure.name,
          lat: treasure.lat,
          lng: treasure.lng,
          source: 'portal',
        })}
        toolbar={(
          <div style={S.mapToolbar} aria-label="ตั้งค่าแผนที่">
            <span style={S.toolbarLabel}>ธีม</span>
            <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} style={{ ...S.toolbarButton, ...(theme === 'light' ? S.toolbarActive : {}) }}>Light</button>
            <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} style={{ ...S.toolbarButton, ...(theme === 'dark' ? S.toolbarActive : {}) }}>Dark</button>
          </div>
        )}
        weatherContent={(
          <>
            <WeatherStatus weather={weather} loading={weatherLoading} error={weatherError} />
            <div style={S.rainRadarRow}>
              <p style={S.rainRadarStatus}>เรดาร์ฝนสด • ครอบคลุมทุกพื้นที่ทั่วกรุงเทพ</p>
              <button type="button" onClick={showBangkokRainRadar} style={S.rainRadarButton}>
                ดูเรดาร์ทั่วกรุงเทพ
              </button>
            </div>
            {isDemo && <WeatherDemoControls />}
          </>
        )}
        navigationContent={(
          <NavigationPanel
            open={navigationOpen}
            phase={navigationPhase}
            status={routeStatus}
            destination={destination}
            route={navigationRoute}
            error={routeError}
            travelMode={travelMode}
            isDemo={isDemo}
            remainingM={remainingM}
            currentStepIndex={currentStepIndex}
            onOpen={() => setNavigationOpen(true)}
            onPickOnMap={beginMapPick}
            onSelectDemo={() => chooseDestination(DEMO_DESTINATIONS[0])}
            onCalculate={() => { void calculateNavigationRoute() }}
            onStart={startNavigation}
            onCancel={cancelNavigation}
            onTravelModeChange={changeTravelMode}
          />
        )}
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
  demoBadge: {
    position: 'absolute',
    left: 14,
    zIndex: 800,
    minHeight: 32,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 11px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    boxShadow: 'var(--shadow-sm)',
    fontSize: 'var(--body4-size)',
    fontWeight: 800,
  },
  mapToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    margin: '2px 0 8px',
    padding: 4,
    borderRadius: 'var(--radius-md)',
    background: 'var(--fill-subtle)',
  },
  rainRadarRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    margin: '-4px 0 10px',
  },
  rainRadarStatus: {
    color: 'var(--text-tertiary)',
    fontSize: 11,
    lineHeight: 1.4,
  },
  rainRadarButton: {
    flexShrink: 0,
    minHeight: 30,
    padding: '5px 9px',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    color: 'var(--primary)',
    fontSize: 11,
    fontWeight: 700,
  },
  toolbarLabel: {
    margin: '0 6px',
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
  },
  toolbarButton: {
    minHeight: 38,
    minWidth: 64,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
  },
  toolbarActive: {
    borderColor: 'var(--divider)',
    background: 'var(--surface)',
    color: 'var(--primary)',
    boxShadow: 'var(--shadow-sm)',
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
