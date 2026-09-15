import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { readArtworks, type Artwork } from '../artMap/artData'
import { createArtScene, facadeCamera, flyArtCamera, OVERVIEW } from '../artMap/mapScene'
import { type FacadeLayer } from '../artMap/FacadeLayer'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../artMap/artMap.css'

type MapCamera = { center: [number, number]; zoom: number; pitch: number; bearing: number; elevation: number }

function markerElement(artwork: Artwork) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'art-marker'
  element.setAttribute('aria-label', `เปิดผลงาน ${artwork.title}`)
  const ring = document.createElement('span')
  ring.className = 'art-marker__ring'
  ring.style.setProperty('--marker-accent', artwork.accent)
  const image = document.createElement('img')
  image.src = artwork.imageUrl
  image.alt = ''
  const title = document.createElement('span')
  title.className = 'art-marker__label'
  title.textContent = artwork.title
  element.append(ring, image, title)
  return element
}

export default function ArtMap() {
  const mapNode = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const layerRef = useRef<FacadeLayer | null>(null)
  const markersRef = useRef<Marker[]>([])
  const mapHomeRef = useRef<MapCamera | null>(null)
  const arrivalRef = useRef<(() => void) | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [artworks, setArtworks] = useState<Artwork[]>(() => readArtworks())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'overview' | 'flying' | 'arrived'>('overview')
  const [mapReady, setMapReady] = useState(false)
  const [introOpen, setIntroOpen] = useState(true)
  const [error, setError] = useState('')
  const [photoZoom, setPhotoZoom] = useState(1)
  const published = useMemo(() => artworks.filter((item) => item.status === 'published'), [artworks])
  const selected = published.find((item) => item.id === selectedId) ?? null

  const cancelFlight = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (arrivalRef.current) map.off('moveend', arrivalRef.current)
    arrivalRef.current = null
    map.stop()
  }, [])

  useEffect(() => {
    const refresh = () => setArtworks(readArtworks())
    window.addEventListener('linemap-artworks-updated', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('linemap-artworks-updated', refresh); window.removeEventListener('storage', refresh) }
  }, [])

  useEffect(() => {
    if (!mapNode.current) return
    const { map, facades } = createArtScene(mapNode.current, { onReady: () => setMapReady(true), onError: setError }, readArtworks().filter((a) => a.status === 'published'))
    mapRef.current = map
    layerRef.current = facades
    const interrupt = (event: { originalEvent?: unknown }) => {
      if (!event.originalEvent || !arrivalRef.current) return
      cancelFlight()
      setPhase('arrived')
    }
    map.on('dragstart', interrupt)
    map.on('zoomstart', interrupt)
    map.on('error', (event) => { if (/webgl|context/i.test(event.error.message)) setError('แสดงฉาก 3D ไม่สำเร็จ กรุณารีโหลดหน้าเว็บ') })
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(mapNode.current)
    return () => {
      cancelFlight()
      observer.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [cancelFlight])

  useEffect(() => { if (mapReady) layerRef.current?.setArtworks(published) }, [published, mapReady])

  const flyToArtwork = useCallback((artwork: Artwork) => {
    const map = mapRef.current
    if (!map || !mapReady) return
    cancelFlight()
    if (!mapHomeRef.current) {
      const center = map.getCenter()
      mapHomeRef.current = { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), elevation: map.getCenterElevation() }
    }
    setSelectedId(artwork.id)
    setPhase('flying')
    const mobile = map.getContainer().clientWidth <= 700
    const camera = artwork.facade ? facadeCamera(map, artwork.facade) : { center: [artwork.lng, artwork.lat] as [number, number], zoom: 18, pitch: 55, bearing: artwork.cameraBearing ?? 0, elevation: 0 }
    const arrive = () => { arrivalRef.current = null; setPhase('arrived') }
    arrivalRef.current = arrive
    map.once('moveend', arrive)
    flyArtCamera(map, { ...camera, padding: { top: 70, bottom: mobile ? 205 : 40, left: 20, right: mobile ? 20 : 340 }, duration: 3800, curve: 1.25, essential: false })
  }, [cancelFlight, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    if (selectedId) return
    markersRef.current = published.map((artwork) => {
      const element = markerElement(artwork)
      element.addEventListener('click', () => flyToArtwork(artwork))
      return new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([artwork.lng, artwork.lat]).addTo(map)
    })
    return () => { markersRef.current.forEach((marker) => marker.remove()) }
  }, [published, selectedId, mapReady, flyToArtwork])

  const returnToMap = useCallback(() => {
    cancelFlight()
    setSelectedId(null)
    setPhase('overview')
    const home = mapHomeRef.current ?? OVERVIEW
    mapHomeRef.current = null
    if (mapRef.current) flyArtCamera(mapRef.current, { ...home, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 1600, essential: false })
  }, [cancelFlight])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !dialogRef.current?.open) returnToMap() }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [returnToMap])

  const enterMap = () => {
    if (!mapReady) return
    setIntroOpen(false)
    mapRef.current?.flyTo({ ...OVERVIEW, duration: 3200, essential: false })
  }
  const rotate = (degrees: number) => {
    cancelFlight()
    setPhase('arrived')
    const map = mapRef.current
    if (map) map.easeTo({ bearing: map.getBearing() + degrees, duration: 800, essential: false })
  }
  const openPhoto = () => { setPhotoZoom(1); dialogRef.current?.showModal() }

  return (
    <main className={`art-map-page${selected ? ' is-focused' : ''}`}>
      <div ref={mapNode} className="art-map-canvas" aria-label="แผนที่งานศิลป์ในกรุงเทพฯ" />
      <header className="art-map-header">
        {selected ? <div className="focus-heading"><button onClick={returnToMap}>← แผนที่</button><div><div className="eyebrow">SONG WAT / ART WALK</div><h1>{selected.title}</h1></div></div> : <div><div className="eyebrow">BANGKOK / DIGITAL ART WALK</div><h1>เมืองที่มองเห็นได้<br /><em>ในอีกชั้นหนึ่ง</em></h1><p>{published.length} จุดงานศิลป์ · กรุงเทพฯ</p></div>}
        <Link className="admin-link" to="/admin">หลังบ้าน ↗</Link>
      </header>
      {!selected && <div className="map-instructions"><span>ลากเพื่อเลื่อน</span><span>คลิกขวาลากเพื่อหมุน</span><span>คลิกภาพเพื่อชมงาน</span></div>}
      {!introOpen && <nav className="artwork-switcher" aria-label="เลือกผลงาน">{published.slice(0, 2).map((a) => <button key={a.id} aria-pressed={a.id === selectedId} onClick={() => flyToArtwork(a)} disabled={!mapReady}><img src={a.imageUrl} alt="" /><span>{a.id === 'songwat-elephant' ? 'ช้าง' : a.id === 'songwat-woman' ? 'หญิงสาว' : a.title}</span></button>)}</nav>}
      {phase === 'flying' && <div className="art-flight-status" role="status">กำลังบินไปยัง {selected?.title}…</div>}
      {error && <div className="art-error" role="alert">{error}</div>}
      {selected && <div className="art-orbit-controls"><button onClick={() => rotate(-45)} aria-label="หมุนรอบอาคารไปทางซ้าย">↶ หมุนซ้าย</button><button onClick={() => flyToArtwork(selected)}>มุมชมงาน</button><button onClick={() => rotate(45)} aria-label="หมุนรอบอาคารไปทางขวา">หมุนขวา ↷</button></div>}
      <aside className={`art-detail ${selected && phase === 'arrived' ? 'is-open' : ''}`} aria-hidden={!selected || phase !== 'arrived'}>
        {selected && phase === 'arrived' && <div className="art-detail__body"><div className="eyebrow">{selected.venue} · {selected.year}</div><h2>{selected.title}</h2><p className="art-detail__artist">{selected.artist}</p><p className="art-detail__description">{selected.description}</p><button className="art-photo-button" onClick={openPhoto}><img src={selected.imageUrl} alt="" /><span>ดูภาพถ่ายต้นฉบับ ↗</span></button><div className="art-detail__links"><a className="art-detail__route" href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">เปิดเส้นทาง ↗</a><button className="art-detail__back" onClick={returnToMap}>กลับแผนที่</button></div></div>}
      </aside>
      <dialog ref={dialogRef} className="art-photo-dialog" aria-label="ภาพถ่ายต้นฉบับของผลงาน"><div className="art-photo-toolbar"><span>{selected?.title}</span><button onClick={() => setPhotoZoom((z) => Math.max(1, z - 0.5))} disabled={photoZoom === 1} aria-label="ย่อภาพ">−</button><button onClick={() => setPhotoZoom((z) => Math.min(3, z + 0.5))} disabled={photoZoom === 3} aria-label="ขยายภาพ">+</button><button onClick={() => dialogRef.current?.close()} aria-label="ปิดภาพถ่าย">×</button></div><div className="art-photo-scroll">{selected && <img src={selected.imageUrl} alt={selected.title} style={{ width: `${photoZoom * 100}%`, maxWidth: 'none', height: photoZoom === 1 ? '100%' : 'auto', objectFit: 'contain' }} />}</div></dialog>
      {introOpen && <section className="art-intro"><div className="art-intro__backdrop" /><div className="art-intro__content"><div className="eyebrow">BANGKOK / ART IN THE CITY</div><h2>ศิลปะไม่ได้อยู่แค่ในแกลเลอรี</h2><p>เดินทางผ่านกรุงเทพฯ ในแผนที่ที่ทุกพิกัดกลายเป็นพื้นที่จัดแสดง</p><button onClick={enterMap} disabled={!mapReady}>{mapReady ? 'เข้าสู่แผนที่ →' : 'กำลังโหลดแผนที่…'}</button></div></section>}
      <footer className="art-map-footer"><span>Map © OpenStreetMap contributors · OpenFreeMap</span><span>Bangkok Art Map / 2026</span></footer>
    </main>
  )
}
