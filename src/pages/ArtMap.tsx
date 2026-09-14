import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { Link } from 'react-router-dom'
import { readArtworks, type Artwork } from '../artMap/artData'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../artMap/artMap.css'

const BANGKOK: [number, number] = [100.5232, 13.7367]

function markerElement(artwork: Artwork, selected: boolean) {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `art-marker${selected ? ' is-selected' : ''}`
  element.setAttribute('aria-label', `เปิดผลงาน ${artwork.title}`)
  element.innerHTML = `<span class="art-marker__ring" style="--marker-accent:${artwork.accent}"></span><img src="${artwork.imageUrl}" alt="" /><span class="art-marker__label">${artwork.title}</span>`
  return element
}

export default function ArtMap() {
  const mapNode = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>(() => readArtworks())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [introOpen, setIntroOpen] = useState(true)
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
      center: BANGKOK,
      zoom: 13.2,
      pitch: 48,
      bearing: -18,
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
              'fill-extrusion-color': '#11161d',
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
        setSelectedId(artwork.id)
        map.flyTo({ center: [artwork.lng, artwork.lat], zoom: 15.8, pitch: 52, speed: 0.8 })
      })
      return new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([artwork.lng, artwork.lat]).addTo(map)
    })
  }, [published, selectedId])

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
      <aside className={`art-detail ${selected ? 'is-open' : ''}`} aria-hidden={!selected}>
        {selected && (
          <>
            <button className="art-detail__close" onClick={() => setSelectedId(null)} aria-label="ปิดรายละเอียด">×</button>
            <img src={selected.imageUrl} alt={selected.title} className="art-detail__image" />
            <div className="art-detail__body">
              <div className="eyebrow">{selected.venue} · {selected.year}</div>
              <h2>{selected.title}</h2>
              <p className="art-detail__artist">{selected.artist} / {selected.medium}</p>
              <p>{selected.description}</p>
              <div className="art-detail__location"><span>สถานที่</span><strong>{selected.address}</strong></div>
              <a className="art-detail__route" href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">เปิดเส้นทาง ↗</a>
            </div>
          </>
        )}
      </aside>
      {introOpen && (
        <section className="art-intro">
          <div className="art-intro__backdrop" />
          <div className="art-intro__content">
            <div className="eyebrow">TOKYO-INSPIRED / BANGKOK EDITION</div>
            <h2>ศิลปะไม่ได้อยู่แค่ในแกลเลอรี</h2>
            <p>เดินทางผ่านกรุงเทพฯ ในแผนที่ที่ทุกพิกัดกลายเป็นพื้นที่จัดแสดง</p>
            <button onClick={() => setIntroOpen(false)}>เข้าสู่แผนที่ <span>→</span></button>
          </div>
        </section>
      )}
      <footer className="art-map-footer"><span>Map © OpenStreetMap contributors · OpenFreeMap</span><span>Bangkok Art Map / 2026</span></footer>
    </main>
  )
}
