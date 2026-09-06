import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Button, Empty, Spinner, useToast } from '../components/ui'
import { CampaignCard } from '../components/CampaignCard'
import { HostProfileHeader } from '../components/HostProfileHeader'
import type { CampaignSummary, Host } from '../types'
import { useShopAccess } from './shopAccess'
import { userFacingError } from '../utils/errors'

export default function ShopHost() {
  const access = useShopAccess(); const { toast, showToast } = useToast(); const [data, setData] = useState<{ host: Host; campaigns: CampaignSummary[] } | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); try { setData(await api.get<{ host: Host; campaigns: CampaignSummary[] }>('/my-shop/host')); setError('') } catch (err) { setError(userFacingError(err, 'โหลดข้อมูล Host ไม่สำเร็จ กรุณาลองใหม่')) } finally { setLoading(false) } }, [])
  useEffect(() => { if (!access.loading && !access.error) load() }, [access.loading, access.error, load])
  const shareHost = async () => { try { if (navigator.share) await navigator.share({ title: data?.host.title || data?.host.name, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); showToast('คัดลอกลิงก์แล้ว') } } catch (err) { if (!(err instanceof DOMException && err.name === 'AbortError')) showToast('แชร์ลิงก์ไม่สำเร็จ กรุณาลองใหม่') } }
  if (access.loading) return <Spinner />
  if (access.error) return <main style={S.state}><p>{access.error}</p><Button onClick={() => window.location.reload()}>ลองใหม่</Button></main>
  if (loading) return <Spinner />
  if (error || !data) return <main style={S.state}><p>{error}</p><Button onClick={load}>ลองใหม่</Button></main>
  return <main style={S.page}><HostProfileHeader host={data.host} onShare={shareHost} onInfo={() => document.getElementById('campaigns')?.scrollIntoView()} /><section id="campaigns" style={S.section}><h2>กิจกรรม</h2>{data.campaigns.length ? <div style={S.grid}>{data.campaigns.map(c => <CampaignCard key={c.slug} campaign={c} hostSlug={data.host.slug} viewer="shop" />)}</div> : <Empty text="ยังไม่มีกิจกรรมที่เปิดอยู่" />}</section>{toast}</main>
}
const S: Record<string, React.CSSProperties> = { page: { maxWidth: 430, minHeight: '100vh', margin: 'auto' }, section: { padding: 16 }, grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }, state: { padding: 32, textAlign: 'center' } }
