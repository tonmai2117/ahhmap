import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { makeArtworkId, readArtworks, writeArtworks, type Artwork, type ArtStatus } from '../artMap/artData'
import '../artMap/admin.css'

const emptyForm: Omit<Artwork, 'id'> = {
  title: '', artist: '', year: new Date().getFullYear().toString(), medium: 'ภาพถ่าย', description: '', venue: '', address: '', lat: 13.7367, lng: 100.5232,
  imageUrl: '', wallImageUrl: '', wallWidth: 190, wallHeight: 300, wallRotation: 0, wallOffsetX: 0, wallOffsetY: -60,
  cameraLat: 13.7367, cameraLng: 100.5232, cameraZoom: 17.1, cameraPitch: 56, cameraBearing: 0,
  accent: '#EE4423', status: 'draft',
}

const NUMERIC_FIELDS = new Set<keyof typeof emptyForm>([
  'lat', 'lng', 'wallWidth', 'wallHeight', 'wallRotation', 'wallOffsetX', 'wallOffsetY',
  'cameraLat', 'cameraLng', 'cameraZoom', 'cameraPitch', 'cameraBearing',
])

export default function Admin() {
  const [artworks, setArtworks] = useState<Artwork[]>(() => readArtworks())
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const publishedCount = useMemo(() => artworks.filter((item) => item.status === 'published').length, [artworks])

  const update = (field: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [field]: NUMERIC_FIELDS.has(field) ? Number(value) : value }))
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) { setNotice('กรุณาใส่ชื่อผลงานและภาพก่อนบันทึก'); return }
    const next = editingId ? artworks.map((item) => item.id === editingId ? { ...form, id: editingId } as Artwork : item) : [...artworks, { ...form, id: makeArtworkId() } as Artwork]
    setArtworks(next); writeArtworks(next); window.dispatchEvent(new Event('linemap-artworks-updated')); setNotice(form.status === 'published' ? 'เผยแพร่ผลงานแล้ว' : 'บันทึกฉบับร่างแล้ว'); setForm(emptyForm); setEditingId(null)
  }
  const edit = (artwork: Artwork) => { setEditingId(artwork.id); setForm({ ...artwork }); setNotice('กำลังแก้ไขผลงาน') }
  const remove = (id: string) => { const next = artworks.filter((item) => item.id !== id); setArtworks(next); writeArtworks(next); window.dispatchEvent(new Event('linemap-artworks-updated')); setNotice('ลบผลงานออกจากรายการแล้ว') }
  const onImage = (field: 'imageUrl' | 'wallImageUrl', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4_000_000) { setNotice('ไฟล์ใหญ่เกิน 4 MB กรุณาเลือกภาพที่เล็กลง'); return }
    const reader = new FileReader(); reader.onload = () => update(field, String(reader.result)); reader.readAsDataURL(file)
  }

  return (
    <main className="admin-page">
      <header className="admin-header"><div><div className="eyebrow">BANGKOK ART MAP / ADMIN</div><h1>จัดการผลงานและพิกัด</h1><p>เพิ่มภาพ ปักหมุด และเผยแพร่ขึ้นแผนที่ได้จากหน้านี้</p></div><Link to="/art-map" className="admin-back">ดูแผนที่ ↗</Link></header>
      <div className="admin-layout">
        <section className="admin-form-card">
          <div className="admin-card-head"><div><span className="eyebrow">{editingId ? 'EDIT ARTWORK' : 'NEW ARTWORK'}</span><h2>{editingId ? 'แก้ไขผลงาน' : 'เพิ่มผลงานใหม่'}</h2></div><span className="storage-badge">LOCAL DEMO STORAGE</span></div>
          <form onSubmit={save}>
            <label>ชื่อผลงาน<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="เช่น แสงที่เดินทางผ่านเมือง" /></label>
            <div className="form-grid"><label>ศิลปิน<input value={form.artist} onChange={(e) => update('artist', e.target.value)} /></label><label>ปีที่สร้าง<input value={form.year} onChange={(e) => update('year', e.target.value)} /></label></div>
            <div className="form-grid"><label>เทคนิค<input value={form.medium} onChange={(e) => update('medium', e.target.value)} /></label><label>สถานที่จัดแสดง<input value={form.venue} onChange={(e) => update('venue', e.target.value)} /></label></div>
            <label>คำอธิบาย<textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} /></label>
            <label>ที่อยู่<input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="ถนน / เขต / กรุงเทพฯ" /></label>
            <div className="form-grid"><label>ละติจูด<input type="number" step="any" value={form.lat} onChange={(e) => update('lat', e.target.value)} /></label><label>ลองจิจูด<input type="number" step="any" value={form.lng} onChange={(e) => update('lng', e.target.value)} /></label></div>
            <div className="upload-grid">
              <div><span className="admin-field-label">ภาพผลงานสำหรับเปิดชม</span><div className="upload-row"><label className="upload-box"><span>{form.imageUrl ? 'เปลี่ยนภาพ' : 'อัปโหลดภาพ'}</span><small>JPG / PNG ไม่เกิน 4 MB</small><input type="file" accept="image/*" onChange={(e) => onImage('imageUrl', e)} /></label>{form.imageUrl && <img src={form.imageUrl} className="upload-preview" alt="ตัวอย่างภาพผลงาน" />}</div></div>
              <div><span className="admin-field-label">ภาพสำหรับวางบนผนัง (ถ้ามี)</span><div className="upload-row"><label className="upload-box"><span>{form.wallImageUrl ? 'เปลี่ยนภาพผนัง' : 'ใช้ภาพเดียวกัน'}</span><small>เว้นว่างเพื่อใช้ภาพผลงาน</small><input type="file" accept="image/*" onChange={(e) => onImage('wallImageUrl', e)} /></label>{form.wallImageUrl && <img src={form.wallImageUrl} className="upload-preview" alt="ตัวอย่างภาพบนผนัง" />}</div></div>
            </div>
            <div className="admin-subhead">มุมบินเข้าหางานและการวางภาพบนผนัง</div>
            <div className="form-grid"><label>ละติจูดจุดกล้อง<input type="number" step="any" value={form.cameraLat} onChange={(e) => update('cameraLat', e.target.value)} /></label><label>ลองจิจูดจุดกล้อง<input type="number" step="any" value={form.cameraLng} onChange={(e) => update('cameraLng', e.target.value)} /></label></div>
            <div className="form-grid"><label>ซูมปลายทาง<input type="number" step="0.1" min="14" max="22" value={form.cameraZoom} onChange={(e) => update('cameraZoom', e.target.value)} /></label><label>องศากล้อง<input type="number" step="1" min="0" max="85" value={form.cameraPitch} onChange={(e) => update('cameraPitch', e.target.value)} /></label></div>
            <div className="form-grid"><label>ทิศกล้อง<input type="number" step="1" value={form.cameraBearing} onChange={(e) => update('cameraBearing', e.target.value)} /></label><label>หมุนภาพบนผนัง<input type="number" step="1" value={form.wallRotation} onChange={(e) => update('wallRotation', e.target.value)} /></label></div>
            <div className="form-grid"><label>กว้างภาพ (px)<input type="number" step="1" min="60" value={form.wallWidth} onChange={(e) => update('wallWidth', e.target.value)} /></label><label>สูงภาพ (px)<input type="number" step="1" min="80" value={form.wallHeight} onChange={(e) => update('wallHeight', e.target.value)} /></label></div>
            <div className="form-grid"><label>เลื่อนภาพ X (px)<input type="number" step="1" value={form.wallOffsetX} onChange={(e) => update('wallOffsetX', e.target.value)} /></label><label>เลื่อนภาพ Y (px)<input type="number" step="1" value={form.wallOffsetY} onChange={(e) => update('wallOffsetY', e.target.value)} /></label></div>
            <div className="form-grid"><label>สีกรอบ marker<input type="color" value={form.accent} onChange={(e) => update('accent', e.target.value)} /></label><label>สถานะ<select value={form.status} onChange={(e) => update('status', e.target.value as ArtStatus)}><option value="draft">ฉบับร่าง</option><option value="published">เผยแพร่</option></select></label></div>
            {notice && <p className="admin-notice" role="status">{notice}</p>}
            <div className="form-actions"><button className="primary-action" type="submit">{editingId ? 'บันทึกการแก้ไข' : 'บันทึกผลงาน'}</button>{editingId && <button type="button" className="secondary-action" onClick={() => { setEditingId(null); setForm(emptyForm) }}>ยกเลิก</button>}</div>
          </form>
        </section>
        <section className="admin-list-card"><div className="admin-card-head"><div><span className="eyebrow">COLLECTION</span><h2>ผลงานทั้งหมด <small>{artworks.length} รายการ / เผยแพร่ {publishedCount}</small></h2></div></div><div className="artwork-list">{artworks.map((artwork) => <article className="admin-artwork" key={artwork.id}><img src={artwork.imageUrl || 'https://placehold.co/160x120/171a1e/e7e2d8?text=ART'} alt="" /><div className="admin-artwork__meta"><span className={`status status-${artwork.status}`}>{artwork.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</span><h3>{artwork.title}</h3><p>{artwork.artist} · {artwork.venue || 'ยังไม่ระบุสถานที่'}</p><small>{artwork.lat.toFixed(4)}, {artwork.lng.toFixed(4)}</small></div><div className="admin-artwork__actions"><button onClick={() => edit(artwork)}>แก้ไข</button><button onClick={() => remove(artwork.id)} className="delete-action">ลบ</button></div></article>)}</div></section>
      </div>
      <p className="admin-footnote">โหมดนี้เก็บข้อมูลในเบราว์เซอร์เครื่องนี้เพื่อทดสอบ flow ก่อนเชื่อมฐานข้อมูลกลางและ storage จริง</p>
    </main>
  )
}
