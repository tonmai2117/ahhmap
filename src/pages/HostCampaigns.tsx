import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api'
import { getHost, getHostCampaigns } from '../api/campaigns'
import { CampaignCard } from '../components/CampaignCard'
import { HostProfileHeader } from '../components/HostProfileHeader'
import { Button, Empty, Spinner, useToast } from '../components/ui'
import type { CampaignSummary, Host } from '../types'
import { userFacingError } from '../utils/errors'

export default function HostCampaigns() {
  const navigate = useNavigate()
  const { hostSlug } = useParams<{ hostSlug: string }>()
  const [host, setHost] = useState<Host | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const campaignSectionRef = useRef<HTMLElement>(null)
  const { toast, showToast } = useToast()

  useEffect(() => {
    if (!hostSlug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let active = true
    Promise.all([getHost(hostSlug), getHostCampaigns(hostSlug)])
      .then(([hostResult, campaignResult]) => {
        if (!active) return
        setHost(hostResult.host)
        setCampaigns(campaignResult.campaigns.filter((campaign) => campaign.status !== 'ended'))
        setLoadError('')
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) setNotFound(true)
        else setLoadError(userFacingError(err, 'โหลดข้อมูล Host ไม่สำเร็จ กรุณาลองใหม่'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [hostSlug])

  const shareHost = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: host?.title || host?.name, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        showToast('คัดลอกลิงก์แล้ว')
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) showToast('แชร์ลิงก์ไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (loading) return <Spinner />

  if (notFound) {
    return (
      <main style={S.page}>
        <div style={S.state}>
          <h1 style={S.stateTitle}>ไม่พบ Host นี้</h1>
          <p style={S.stateText}>ลิงก์อาจไม่ถูกต้อง หรือ Host ยังไม่เปิดให้บริการ</p>
          <Button type="button" onClick={() => navigate('/host')}>ดู Host ปัจจุบัน</Button>
        </div>
      </main>
    )
  }

  if (!host || loadError) {
    return (
      <main style={S.page}>
        <div style={S.state}>
          <h1 style={S.stateTitle}>โหลดข้อมูลไม่สำเร็จ</h1>
          <p style={S.stateText}>{loadError}</p>
          <Button type="button" onClick={() => window.location.reload()}>ลองอีกครั้ง</Button>
        </div>
      </main>
    )
  }

  return (
    <main style={S.page}>
      <HostProfileHeader
        host={host}
        onShare={shareHost}
        onInfo={() => campaignSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />
      <section ref={campaignSectionRef} style={S.campaignSection} aria-labelledby="campaigns-title">
        <h2 id="campaigns-title" style={S.sectionTitle}>Campaigns</h2>
        {campaigns.length === 0 ? (
          <Empty text="ยังไม่มีกิจกรรมที่เปิดให้เข้าร่วม" />
        ) : (
          <div style={S.grid}>
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} hostSlug={host.slug} />
            ))}
          </div>
        )}
      </section>
      {toast}
    </main>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 430,
    minHeight: '100vh',
    margin: '0 auto',
    paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    background: 'var(--background)',
  },
  campaignSection: {
    scrollMarginTop: 12,
    padding: '8px 16px 0',
  },
  sectionTitle: {
    margin: '0 14px 12px',
    fontFamily: 'var(--font-brand)',
    fontSize: 24,
    fontWeight: 800,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 14,
  },
  state: {
    minHeight: '75vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    textAlign: 'center',
  },
  stateTitle: {
    margin: 0,
    fontFamily: 'var(--font-brand)',
    fontSize: 24,
  },
  stateText: {
    margin: '10px 0 22px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
}
