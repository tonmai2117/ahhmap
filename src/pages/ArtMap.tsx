import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { readArtworks, type Artwork } from '../artMap/artData'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../artMap/artMap.css'

const SONG_WAT: [number, number] = [100.509, 13.7372]

type MapCamera = { center: [number, number]; zoom: number; pitch: number; bearing: number }

function markerElement(artwork: Artwork, selected: boolean) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `art-marker${selected ? ' is-selected' : ''}`
  element.setAttribute('aria-label', `เปิดผลงาน ${artwork.title}`)
  element.innerHTML = `<span class="art-marker__ring" style="--marker-accent:${artwork.accent}"></span><img src="${artwork.imageUrl}" alt="" /><span class="art-marker__label">${artwork.title}</span>`
  return element
}

function facadeElement(artwork: Artwork) {
  const element = document.createElement('div')
  element.className = 'art-facade-marker'
  element.style.setProperty('--facade-width', `${artwork.wallWidth ?? 190}px`)
  element.style.setProperty('--facade-height', `${artwork.wallHeight ?? 300}px`)
  const image = document.createElement('img')
  image.src = artwork.wallImageUrl || artwork.imageUrl
  image.alt = ''
  const caption = document.createElement('span')
  caption.className = 'art-facade-marker__caption'
  caption.textContent = 'งานบนผนัง'
  element.append(image, caption)
  return element
}

export default function ArtMap() {
  const mapNode = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const facadeMarkersRef = useRef<Marker[]>([])
  const mapHomeRef = useRef<MapCamera | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>(() => readArtworks())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [facadeId, setFacadeId] = useState<string | null>(null)
  const [flyingId, setFlyingId] = useState<string | null>(null)
  const [introOpen, setIntroOpen] = useState(true)
  const [introLeaving, setIntroLeaving] = useState(false)
  const [language, setLanguage] = useState<'th' | 'en'>('th')

  const published = useMemo(() => artworks.filter((item) => item.status === 'published'), [artworks])
  const selected = published.find((item) => item.id === selectedId) ?? null

  useEffect(() => {
    const refresh = () => setArtworks(readArtworks())
    window.addEventListener('linemap-artworks-updated', refresh)
    return () => window.removeEventListener('linemap-artworks-updated', refresh)
  }, [])

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [100.5232, 13.747] as [number, number],
      zoom: 10.8,
      pitch: 18,
      bearing: -8,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right')
    map.on('load', () => {
      const style = map.getStyle()
      const sourceId = Object.keys(style.sources).find((id) => style.sources[id].type === 'vector')
      if (sourceId && !map.getLayer('linemap-3d-buildings')) {
        try {
          map.addLayer({
            id: 'linemap-3d-buildings',
            type: 'fill-extrusion',
            source: sourceId,
            'source-layer': 'building',
            minzoom: 13,
            paint: {
              'fill-extrusion-color': '#351512',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 8],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.72,
            },
          },)
        } catch {
          // Some styles do not expose an OSM building source; the base style remains usable.
        }
      }
    })
    map.on('click', 'linemap-3d-buildings', () => map.getCanvas().style.cursor = '')
    mapRef.current = map
    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      facadeMarkersRef.current.forEach((marker) => marker.remove())
      facadeMarkersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = published.map((artwork) => {
      const element = markerElement(artwork, artwork.id === selectedId)
      element.addEventListener('click', () => {
        flyToArtwork(artwork)
      })
      return new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([artwork.lng, artwork.lat]).addTo(map)
    })
  }, [published, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    facadeMarkersRef.current.forEach((marker) => marker.remove())
    facadeMarkersRef.current = []
    if (!facadeId) return
    const artwork = published.find((item) => item.id === facadeId)
    if (!artwork) return
    const element = facadeElement(artwork)
    const marker = new maplibregl.Marker({
      element,
      anchor: 'center',
      pitchAlignment: 'map',
      rotationAlignment: 'map',
      offset: [artwork.wallOffsetX ?? 0, artwork.wallOffsetY ?? -60],
    })
      .setLngLat([artwork.lng, artwork.lat])
      .setRotation(artwork.wallRotation ?? 0)
      .addTo(map)
    facadeMarkersRef.current = [marker]
    return () => { marker.remove() }
  }, [facadeId, published])

  const flyToArtwork = (artwork: Artwork) => {
    const map = mapRef.current
    if (!map) return
    if (!mapHomeRef.current) {
      const center = map.getCenter()
      mapHomeRef.current = { center: [center.lng, center.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }
    }
    setSelectedId(null)
    setFacadeId(null)
    setFlyingId(artwork.id)
    map.stop()
    map.once('moveend', () => {
      setFlyingId(null)
      setSelectedId(artwork.id)
      setFacadeId(artwork.id)
    })
    map.flyTo({
      center: [artwork.cameraLng ?? artwork.lng, artwork.cameraLat ?? artwork.lat],
      zoom: artwork.cameraZoom ?? 17.1,
      pitch: artwork.cameraPitch ?? 56,
      bearing: artwork.cameraBearing ?? 0,
      duration: 3600,
      curve: 1.35,
      speed: 0.72,
      essential: true,
    })
  }

  const returnToMap = () => {
    const map = mapRef.current
    setSelectedId(null)
    setFacadeId(null)
    if (!map || !mapHomeRef.current) return
    const home = mapHomeRef.current
    setFlyingId('return')
    map.stop()
    map.once('moveend', () => setFlyingId(null))
    map.flyTo({ ...home, duration: 1800, curve: 1.2, essential: true })
  }

  const enterMap = () => {
    if (introLeaving) return
    setIntroLeaving(true)
    mapRef.current?.flyTo({
      center: SONG_WAT,
      zoom: 15.4,
      pitch: 54,
      bearing: -28,
      duration: 3800,
      curve: 1.3,
      speed: 0.72,
      essential: true,
    })
    window.setTimeout(() => {
      setIntroOpen(false)
      setIntroLeaving(false)
    }, 560)
  }

  return (
    <main className="art-map-page">
      <div ref={mapNode} className="art-map-canvas" aria-label="แผนที่งานศิลป์ในกรุงเทพฯ" />
      <div className="city-wireframe" aria-hidden="true">
        {Array.from({ length: 20 }, (_, index) => <span key={index} style={{ height: `${38 + ((index * 17) % 90)}px`, left: `${(index * 6.2) % 100}%`, animationDelay: `${index * -0.25}s` }} />)}
      </div>
      <header className="art-map-header">
        <div>
          <div className="eyebrow">BANGKOK / DIGITAL ART WALK</div>
          <h1>เมืองที่มองเห็นได้<br /><em>ในอีกชั้นหนึ่ง</em></h1>
          <p>{published.length} จุดงานศิลป์ · กรุงเทพฯ</p>
        </div>
        <div className="header-actions">
          <button className="language-toggle" onClick={() => setLanguage(language === 'th' ? 'en' : 'th')} aria-label="เปลี่ยนภาษา">{language === 'th' ? 'TH / EN' : 'EN / TH'}</button>
          <Link className="admin-link" to="/admin">หลังบ้าน ↗</Link>
        </div>
      </header>
      <div className="map-instructions"><span>ลากเพื่อมองรอบเมือง</span><span>Scroll เพื่อซูม</span><span>คลิกภาพเพื่อชมงาน</span></div>
      {flyingId && <div className="art-flight-status" role="status">{flyingId === 'return' ? 'กำลังกลับสู่แผนที่…' : 'กำลังพาไปชมงานบนผนัง…'}</div>}
      <aside className={`art-detail ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>
        {selected && (
          <>
            <button className="art-detail__close" onClick={returnToMap} aria-label="กลับไปแผนที่">×</button>
            <img src={selected.imageUrl} alt={selected.title} className="art-detail__image" />
            <div className="art-detail__body">
              <div className="eyebrow">{selected.venue} · {selected.year}</div>
              <h2>{selected.title}</h2>
              <p className="art-detail__artist">{selected.artist} / {selected.medium}</p>
              <p>{selected.description}</p>
              <div className="art-detail__location"><span>สถานที่</span><strong>{selected.address}</strong></div>
              <div className="art-detail__links">
                <a className="art-detail__route" href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">เปิดเส้นทาง ↗</a>
                <a className="art-detail__route art-detail__route--muted" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">ดูภาพสถานที่ ↗</a>
              </div>
              <button className="art-detail__back" onClick={returnToMap}>← กลับไปดูแผนที่</button>
            </div>
          </>
        )}
      </aside>
      {introOpen && (
          <section className={`art-intro${introLeaving ? ' is-leaving' : ''}`}>
          <div className="art-intro__backdrop" />
          <div className="art-intro__content">
            <div className="eyebrow">TOKYO-INSPIRED / BANGKOK EDITION</div>
            <h2>ศิลปะไม่ได้อยู่แค่ในแกลเลอรี</h2>
            <p>เดินทางผ่านกรุงเทพฯ ในแผนที่ที่ทุกพิกัดกลายเป็นพื้นที่จัดแสดง</p>
            <button onClick={enterMap} disabled={introLeaving}>เข้าสู่แผนที่ <span>→</span></button>
          </div>
        </section>
      )}
      <footer className="art-map-footer"><span>Map © OpenStreetMap contributors · OpenFreeMap</span><span>Bangkok Art Map / 2026</span></footer>
    </main>
  )
}
