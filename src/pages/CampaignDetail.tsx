import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api'
import { getCampaignDetail, joinCampaign } from '../api/campaigns'
import { CampaignHowToModal } from '../components/CampaignHowToModal'
import { CampaignJoinCTA } from '../components/CampaignJoinCTA'
import { Icon } from '../components/Icon'
import { ImagePlaceholder } from '../components/ImagePlaceholder'
import { Button, Spinner, useToast } from '../components/ui'
import { shareCampaign } from '../liff'
import type { Campaign, CampaignParticipation } from '../types'
import { userFacingError } from '../utils/errors'
import { campaignDetailFailureState } from './campaignDetailState'
import { formatRange } from './campaignDates'

export default function CampaignDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hostSlug, campaignSlug } = useParams<{ hostSlug: string; campaignSlug: string }>()
  const [searchParams] = useSearchParams()
  const fromShop = searchParams.get('from') === 'shop'
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [participation, setParticipation] = useState<CampaignParticipation | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [joining, setJoining] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const howToButtonRef = useRef<HTMLButtonElement>(null)
  const { toast, showToast } = useToast()

  useEffect(() => {
    if (!hostSlug || !campaignSlug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let active = true
    getCampaignDetail(hostSlug, campaignSlug)
      .then((result) => {
        if (!active) return
        setCampaign(result.campaign)
        setParticipation(result.participation)
        setLoadError('')
      })
      .catch((err: unknown) => {
        if (!active) return
        if (campaignDetailFailureState(err) === 'not_found') setNotFound(true)
        else setLoadError(userFacingError(err, 'โหลดรายละเอียดกิจกรรมไม่สำเร็จ กรุณาลองใหม่'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [campaignSlug, hostSlug])

  const closeHowTo = useCallback(() => setShowHowTo(false), [])

  const mapPath = () => {
    const params = new URLSearchParams({ campaign: campaignSlug!, host: hostSlug! })
    return `/map?${params.toString()}`
  }

  const handleJoinOrPlay = async () => {
    if (!campaign || !participation || !hostSlug || !campaignSlug) return
    if (participation.joined) {
      navigate(mapPath())
      return
    }

    setJoining(true)
    try {
      await joinCampaign(hostSlug, campaignSlug)
      setParticipation({ joined: true, joined_at: new Date().toISOString(), last_active_at: null })
      navigate(mapPath())
    } catch (err) {
      if (
        err instanceof ApiError &&
        ((err.status === 404 && err.message === 'not_registered') ||
          (err.status === 409 && err.message === 'registration_incomplete'))
      ) {
        const next = `${location.pathname}${location.search}`
        navigate(`/register?next=${encodeURIComponent(next)}`)
      } else if (err instanceof ApiError && err.message === 'campaign_not_joinable') {
        showToast('กิจกรรมนี้ยังไม่เปิดให้เข้าร่วม')
      } else {
        showToast(userFacingError(err, 'เข้าร่วมกิจกรรมไม่สำเร็จ กรุณาลองใหม่'))
      }
    } finally {
      setJoining(false)
    }
  }

  const handleShare = async () => {
    if (!campaign || !hostSlug || !campaignSlug) return
    try {
      const result = await shareCampaign({ hostSlug, campaignSlug, title: campaign.title })
      if (result === 'clipboard') showToast('คัดลอกลิงก์แล้ว')
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) showToast('แชร์ลิงก์ไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  if (loading) return <Spinner />

  if (notFound) {
    return (
      <main style={S.page}>
        <div style={S.state}>
          <h1 style={S.stateTitle}>ไม่พบกิจกรรมนี้</h1>
          <p style={S.stateText}>ลิงก์อาจหมดอายุหรือกิจกรรมไม่ได้เปิดเผยแล้ว</p>
          <Button
            type="button"
            onClick={() => navigate(fromShop ? '/shop/host' : hostSlug ? `/hosts/${encodeURIComponent(hostSlug)}/campaigns` : '/host')}
          >
            {fromShop ? 'กลับหน้ากิจกรรมของ Host' : 'ดูกิจกรรมอื่น'}
          </Button>
        </div>
      </main>
    )
  }

  if (!campaign || !participation || loadError) {
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
      <ImagePlaceholder
        aspectRatio="4 / 3"
        src={campaign.cover_url}
        alt={`ภาพปก ${campaign.title}`}
      />
      <div style={S.content}>
        <section style={S.header}>
          <div style={S.headingCopy}>
            <h1 style={S.title}>{campaign.title}</h1>
            {campaign.subtitle && <p style={S.subtitle}>{campaign.subtitle}</p>}
          </div>
          <ImagePlaceholder
            size={96}
            shape="circle"
            src={campaign.badge_image_url}
            alt={`ตรากิจกรรม ${campaign.title}`}
          />
        </section>

        <div style={S.actionRow}>
          <button type="button" onClick={handleShare} style={S.pillButton}>
            <Icon name="route" size={22} />
            เล่นกับเพื่อน
          </button>
          <button
            ref={howToButtonRef}
            type="button"
            onClick={() => setShowHowTo(true)}
            style={S.pillButton}
          >
            <span style={S.infoIcon}>i</span>
            วิธีเล่น
          </button>
        </div>

        <div style={S.metaList}>
          <div style={S.metaRow}>
            <Icon name="list" size={24} />
            <span>{formatRange(campaign.starts_at, campaign.ends_at)}</span>
          </div>
          {campaign.location_text && (
            <div style={S.metaRow}>
              <Icon name="pin" size={26} />
              <span>{campaign.location_text}</span>
            </div>
          )}
        </div>

        <section style={S.detailSection}>
          <h2 style={S.detailTitle}>Campaign Detail</h2>
          <p style={S.description}>{campaign.description || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
        </section>
      </div>

      {!fromShop && (
        <CampaignJoinCTA
          status={campaign.status}
          participation={participation}
          busy={joining}
          onClick={handleJoinOrPlay}
        />
      )}

      <CampaignHowToModal
        open={showHowTo}
        title="วิธีเล่น"
        content={campaign.how_to_play || 'ยังไม่มีรายละเอียดวิธีเล่น'}
        onClose={closeHowTo}
        returnFocusRef={howToButtonRef}
      />
      {toast}
    </main>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 430,
    minHeight: '100vh',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--background)',
  },
  content: {
    flex: 1,
    padding: '24px 28px 48px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  headingCopy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-brand)',
    fontSize: 28,
    lineHeight: 1.35,
    fontWeight: 800,
  },
  subtitle: {
    margin: '8px 0 0',
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body1-size)',
  },
  actionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 30,
  },
  pillButton: {
    minWidth: 0,
    flex: '0 1 162px',
    minHeight: 52,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
    padding: '10px 16px',
    border: 0,
    borderRadius: 'var(--radius-full)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    fontSize: 'var(--body1-size)',
    whiteSpace: 'nowrap',
  },
  infoIcon: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid currentColor',
    borderRadius: 'var(--radius-full)',
    fontFamily: 'serif',
    fontWeight: 800,
    lineHeight: 1,
  },
  metaList: {
    display: 'grid',
    gap: 22,
    marginTop: 32,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    color: 'var(--text-primary)',
    fontSize: 'var(--body1-size)',
    lineHeight: 1.45,
  },
  detailSection: {
    marginTop: 28,
    paddingTop: 28,
    borderTop: '2px solid var(--divider)',
  },
  detailTitle: {
    margin: '0 0 10px',
    fontFamily: 'var(--font-brand)',
    fontSize: 22,
    fontWeight: 800,
  },
  description: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 'var(--body1-size)',
    lineHeight: 1.55,
    whiteSpace: 'pre-line',
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
