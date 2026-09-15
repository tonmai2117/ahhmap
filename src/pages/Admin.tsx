import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { makeArtworkId, readArtworks, writeArtworks, type Artwork, type ArtStatus } from '../artMap/artData'
import { type FacadePlacement, validFacade } from '../artMap/facadeGeometry'
import '../artMap/admin.css'

type FormData = Omit<Artwork, 'id'>
const emptyFacade: FacadePlacement = { wallStart: [100.5089, 13.7371], wallEnd: [100.509, 13.7372], outwardBearing: 0, along: .5, width: 3, height: 4, bottom: .3, cameraDistance: 10 }
const emptyForm: FormData = { title: '', artist: '', year: new Date().getFullYear().toString(), medium: 'จิตรกรรมฝาผนัง', description: '', venue: '', address: '', lat: 13.7367, lng: 100.5232, imageUrl: '', wallImageUrl: '', facade: null, accent: '#EE4423', status: 'draft' }
const NUMERIC_FIELDS = new Set(['lat', 'lng'])

export default function Admin() {
  const [artworks, setArtworks] = useState<Artwork[]>(() => readArtworks())
  const [form, setForm] = useState<FormData>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const publishedCount = useMemo(() => artworks.filter((item) => item.status === 'published').length, [artworks])
  const update = (field: keyof FormData, value: string) => setForm((current) => ({ ...current, [field]: NUMERIC_FIELDS.has(field) ? Number(value) : value }))
  const updateFacade = (field: keyof FacadePlacement, value: string) => setForm((current) => ({ ...current, facade: { ...(current.facade ?? emptyFacade), [field]: Number(value) } }))
  const updatePoint = (which: 'wallStart' | 'wallEnd', index: 0 | 1, value: string) => setForm((current) => { const facade = current.facade ?? emptyFacade; const point: [number, number] = [...facade[which]] as [number, number]; point[index] = Number(value); return { ...current, facade: { ...facade, [which]: point } } })
  const save = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.imageUrl.trim()) { setNotice('กรุณาใส่ชื่อผลงานและภาพก่อนบันทึก'); return }
    if (form.facade && !validFacade(form.facade)) { setNotice('ตรวจพิกัดผนังและขนาดภาพบนผนังอีกครั้ง'); return }
    const item = { ...form, id: editingId ?? makeArtworkId() } as Artwork
    const next = editingId ? artworks.map((old) => old.id === editingId ? item : old) : [...artworks, item]
    try { writeArtworks(next); setArtworks(next); window.dispatchEvent(new Event('linemap-artworks-updated')); setNotice(form.status === 'published' ? 'เผยแพร่ผลงานแล้ว' : 'บันทึกฉบับร่างแล้ว'); setForm(emptyForm); setEditingId(null) } catch { setNotice('บันทึกไม่สำเร็จ พื้นที่จัดเก็บในเบราว์เซอร์อาจเต็ม') }
  }
  const edit = (artwork: Artwork) => { setEditingId(artwork.id); setForm({ ...artwork, facade: artwork.facade ? { ...artwork.facade } : null }); setNotice('กำลังแก้ไขผลงาน') }
  const remove = (id: string) => { const next = artworks.filter((item) => item.id !== id); try { writeArtworks(next); setArtworks(next); window.dispatchEvent(new Event('linemap-artworks-updated')); setNotice('ลบผลงานออกจากรายการแล้ว') } catch { setNotice('ลบไม่สำเร็จ') } }
  const onImage = (field: 'imageUrl' | 'wallImageUrl', event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 4_000_000) { setNotice('ไฟล์ใหญ่เกิน 4 MB กรุณาเลือกภาพที่เล็กลง'); return } const reader = new FileReader(); reader.onload = () => update(field, String(reader.result)); reader.readAsDataURL(file) }
  return <main className="admin-page">
    <header className="admin-header"><div><div className="eyebrow">BANGKOK ART MAP / ADMIN</div><h1>จัดการผลงานและพิกัด</h1><p>เพิ่มภาพ ปักหมุด และวางภาพให้แนบกับผนังอาคารแบบ 3D</p></div><Link to="/art-map" className="admin-back">ดูแผนที่ ↗</Link></header>
    <div className="admin-layout">
      <section className="admin-form-card"><div className="admin-card-head"><div><span className="eyebrow">{editingId ? 'EDIT ARTWORK' : 'NEW ARTWORK'}</span><h2>{editingId ? 'แก้ไขผลงาน' : 'เพิ่มผลงานใหม่'}</h2></div><span className="storage-badge">LOCAL DEMO STORAGE</span></div>
        <form onSubmit={save}>
          <label>ชื่อผลงาน<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="เช่น ช้างแห่งทรงวาด" /></label>
          <div className="form-grid"><label>ศิลปิน<input value={form.artist} onChange={(e) => update('artist', e.target.value)} /></label><label>ปีที่สร้าง<input value={form.year} onChange={(e) => update('year', e.target.value)} /></label></div>
          <div className="form-grid"><label>เทคนิค<input value={form.medium} onChange={(e) => update('medium', e.target.value)} /></label><label>สถานที่จัดแสดง<input value={form.venue} onChange={(e) => update('venue', e.target.value)} /></label></div>
          <label>คำอธิบาย<textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} /></label><label>ที่อยู่<input value={form.address} onChange={(e) => update('address', e.target.value)} /></label>
          <div className="form-grid"><label>ละติจูดหมุด<input type="number" step="any" value={form.lat} onChange={(e) => update('lat', e.target.value)} /></label><label>ลองจิจูดหมุด<input type="number" step="any" value={form.lng} onChange={(e) => update('lng', e.target.value)} /></label></div>
          <div className="upload-grid"><div><span className="admin-field-label">ภาพผลงาน</span><div className="upload-row"><label className="upload-box"><span>{form.imageUrl ? 'เปลี่ยนภาพ' : 'อัปโหลดภาพ'}</span><small>JPG / PNG ไม่เกิน 4 MB</small><input type="file" accept="image/*" onChange={(e) => onImage('imageUrl', e)} /></label>{form.imageUrl && <img src={form.imageUrl} className="upload-preview" alt="ตัวอย่างภาพผลงาน" />}</div></div><div><span className="admin-field-label">ภาพที่จะติดบนผนัง</span><div className="upload-row"><label className="upload-box"><span>{form.wallImageUrl ? 'เปลี่ยนภาพ' : 'ใช้ภาพผลงาน'}</span><small>เว้นว่างเพื่อใช้ภาพผลงาน</small><input type="file" accept="image/*" onChange={(e) => onImage('wallImageUrl', e)} /></label>{form.wallImageUrl && <img src={form.wallImageUrl} className="upload-preview" alt="ตัวอย่างภาพบนผนัง" />}</div></div></div>
          <div className="admin-subhead">ตำแหน่งผนัง 3D (หน่วยเป็นเมตร)</div>
          <label className="facade-toggle"><input type="checkbox" checked={Boolean(form.facade)} onChange={(e) => setForm((current) => ({ ...current, facade: e.target.checked ? { ...emptyFacade } : null }))} /> ติดภาพเข้ากับผนังอาคาร</label>
          {form.facade && <div className="facade-editor"><p className="facade-help">ใส่ปลายผนังจากแผนที่หรือ Street View; ภาพจะเป็นระนาบแนวตั้งและถูกอาคารบังด้วย depth buffer เมื่อหมุนกล้อง</p><div className="form-grid"><label>ผนังเริ่ม ลองจิจูด<input type="number" step="any" value={form.facade.wallStart[0]} onChange={(e) => updatePoint('wallStart', 0, e.target.value)} /></label><label>ผนังเริ่ม ละติจูด<input type="number" step="any" value={form.facade.wallStart[1]} onChange={(e) => updatePoint('wallStart', 1, e.target.value)} /></label><label>ผนังจบ ลองจิจูด<input type="number" step="any" value={form.facade.wallEnd[0]} onChange={(e) => updatePoint('wallEnd', 0, e.target.value)} /></label><label>ผนังจบ ละติจูด<input type="number" step="any" value={form.facade.wallEnd[1]} onChange={(e) => updatePoint('wallEnd', 1, e.target.value)} /></label></div><div className="form-grid"><label>ทิศผนังออก (องศา)<input type="number" step="1" value={form.facade.outwardBearing} onChange={(e) => updateFacade('outwardBearing', e.target.value)} /></label><label>ตำแหน่งตามแนวผนัง (0–1)<input type="number" step=".01" min="0" max="1" value={form.facade.along} onChange={(e) => updateFacade('along', e.target.value)} /></label><label>กว้างภาพ (เมตร)<input type="number" step=".1" min=".25" value={form.facade.width} onChange={(e) => updateFacade('width', e.target.value)} /></label><label>สูงภาพ (เมตร)<input type="number" step=".1" min=".25" value={form.facade.height} onChange={(e) => updateFacade('height', e.target.value)} /></label><label>ความสูงจากพื้น (เมตร)<input type="number" step=".1" min="0" value={form.facade.bottom} onChange={(e) => updateFacade('bottom', e.target.value)} /></label><label>ระยะกล้องบินเข้า (เมตร)<input type="number" step="1" min="3" value={form.facade.cameraDistance} onChange={(e) => updateFacade('cameraDistance', e.target.value)} /></label></div></div>}
          <div className="form-grid"><label>สี marker<input type="color" value={form.accent} onChange={(e) => update('accent', e.target.value)} /></label><label>สถานะ<select value={form.status} onChange={(e) => update('status', e.target.value as ArtStatus)}><option value="draft">ฉบับร่าง</option><option value="published">เผยแพร่</option></select></label></div>
          {notice && <p className="admin-notice" role="status">{notice}</p>}<div className="form-actions"><button className="primary-action" type="submit">{editingId ? 'บันทึกการแก้ไข' : 'บันทึกผลงาน'}</button>{editingId && <button type="button" className="secondary-action" onClick={() => { setEditingId(null); setForm(emptyForm) }}>ยกเลิก</button>}</div>
        </form>
      </section>
      <section className="admin-list-card"><div className="admin-card-head"><div><span className="eyebrow">COLLECTION</span><h2>ผลงานทั้งหมด <small>{artworks.length} รายการ / เผยแพร่ {publishedCount}</small></h2></div></div><div className="artwork-list">{artworks.map((artwork) => <article className="admin-artwork" key={artwork.id}><img src={artwork.imageUrl || 'https://placehold.co/160x120/171a1e/e7e2d8?text=ART'} alt="" /><div className="admin-artwork__meta"><span className={`status status-${artwork.status}`}>{artwork.status === 'published' ? 'เผยแพร่' : 'ฉบับร่าง'}</span><h3>{artwork.title}</h3><p>{artwork.artist} · {artwork.venue || 'ยังไม่ระบุสถานที่'}</p><small>{artwork.facade ? '3D WALL' : 'MARKER ONLY'} · {artwork.lat.toFixed(4)}, {artwork.lng.toFixed(4)}</small></div><div className="admin-artwork__actions"><button onClick={() => edit(artwork)}>แก้ไข</button><button onClick={() => remove(artwork.id)} className="delete-action">ลบ</button></div></article>)}</div></section>
    </div><p className="admin-footnote">โหมดนี้เก็บข้อมูลในเบราว์เซอร์เครื่องนี้เพื่อทดสอบ flow; เมื่อต่อฐานข้อมูลจริงให้ย้าย adapter ใน src/artMap/artData.ts ไปใช้ API/Storage กลาง</p>
  </main>
}
