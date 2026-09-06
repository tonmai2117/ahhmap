import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Badge, Button, Empty, Spinner, StatCard, Tabs } from '../components/ui'
import type { ShopAggregateStat, Stats } from '../types'
import { useShopAccess } from './shopAccess'
import { userFacingError } from '../utils/errors'

export default function ShopStats() {
  const access = useShopAccess(); const [tab, setTab] = useState<'mine' | 'all'>('mine'); const [mine, setMine] = useState<Stats | null>(null); const [all, setAll] = useState<ShopAggregateStat[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); try { const [own, aggregate] = await Promise.all([api.get<Stats>('/my-shop/stats'), api.get<{ shops: ShopAggregateStat[] }>('/my-shop/stats/aggregate')]); setMine(own); setAll(aggregate.shops); setError('') } catch (err) { setError(userFacingError(err, 'โหลดสถิติร้านไม่ได้ กรุณาลองใหม่')) } finally { setLoading(false) } }, [])
  useEffect(() => { if (!access.loading && !access.error) load() }, [access.loading, access.error, load])
  if (access.loading) return <Spinner />
  if (access.error) return <main style={S.state}><p>{access.error}</p><Button onClick={() => window.location.reload()}>ลองใหม่</Button></main>
  if (loading) return <Spinner />
  if (error) return <main style={S.state}><p>{error}</p><Button onClick={load}>ลองใหม่</Button></main>
  return <main style={S.page}><header style={S.header}><h1>สถิติร้านค้า</h1>{mine?.shop && <p>{mine.shop.name}</p>}</header><Tabs value={tab} onChange={value => setTab(value as 'mine' | 'all')} tabs={[{ value: 'mine', label: 'สถิติ' }, { value: 'all', label: 'สถิติรวม' }]} />
    {tab === 'mine' && mine && <section style={S.metrics}><Metrics stat={mine} /></section>}
    {tab === 'all' && <section style={S.list}>{all.length === 0 ? <Empty text="ยังไม่มีร้านใน Host นี้" /> : all.map(item => <AggregateShopCard key={item.shop.id} item={item} />)}</section>}
  </main>
}
function Metrics({ stat }: { stat: Pick<Stats, 'nearby_unique_users' | 'redeem_count' | 'used_count'> }) { return <><StatCard icon="user" label="คนเข้าใกล้ร้าน" value={stat.nearby_unique_users} note="ผู้เล่นไม่ซ้ำที่เก็บสมบัติภายใน 500 เมตร" /><StatCard icon="wallet" label="แลกคูปอง" value={stat.redeem_count} /><StatCard icon="check" label="ใช้งานจริง" value={stat.used_count} /></> }
function AggregateShopCard({ item }: { item: ShopAggregateStat }) {
  const letter = (Array.from(item.shop.name.trim())[0] ?? '?').toUpperCase()
  return <article style={S.card}>
    <div style={S.avatar}>{letter}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={S.nameRow}>
        <b style={S.name}>{item.shop.name}</b>
        {item.shop.is_current && <Badge label="ร้านของฉัน" />}
      </div>
      <div style={S.metricRow}>
        <AggregateMetric value={item.nearby_unique_users} label="คนเข้าใกล้ร้าน" note="นับจากการเก็บสมบัติหน้าร้าน" />
        <AggregateMetric value={item.redeem_count} label="แลกคูปอง" />
        <AggregateMetric value={item.used_count} label="ใช้งานจริง" />
      </div>
    </div>
  </article>
}
function AggregateMetric({ value, label, note }: { value: number; label: string; note?: string }) {
  return <div>
    <p style={S.metricValue}>{value}</p>
    <p style={S.metricLabel}>{label}</p>
    {note && <p style={S.metricNote}>{note}</p>}
  </div>
}
const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 430, minHeight: '100vh', margin: 'auto', background: 'var(--background-secondary)' },
  header: { padding: '18px 16px 10px', background: 'var(--surface)' },
  metrics: { display: 'grid', gap: 16, padding: 16 },
  list: { display: 'grid', gap: 12, padding: 16 },
  card: { display: 'flex', gap: 12, background: 'var(--surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '18px 16px' },
  avatar: { width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--fill-subtle)', color: 'var(--primary)', fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'flex-start', marginTop: 4 },
  nameRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  name: { fontFamily: 'var(--font-brand)', fontSize: 20, fontWeight: 800, lineHeight: 1.3 },
  metricRow: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12, alignItems: 'start' },
  metricValue: { fontSize: 30, fontWeight: 800, lineHeight: 1 },
  metricLabel: { fontSize: 'var(--body3-size)', color: 'var(--text-secondary)', marginTop: 6 },
  metricNote: { fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.35 },
  state: { maxWidth: 430, minHeight: '100vh', margin: 'auto', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12, textAlign: 'center', padding: 24 },
}
