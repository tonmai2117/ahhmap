import { Link } from 'react-router-dom'
import type { CampaignSummary } from '../types'
import { formatExpiry, remainingLabel } from '../pages/campaignDates'
import { ImagePlaceholder } from './ImagePlaceholder'

export function CampaignCard({
  campaign,
  hostSlug,
  viewer = 'player',
}: {
  campaign: CampaignSummary
  hostSlug: string
  viewer?: 'player' | 'shop'
}) {
  const to = `/hosts/${encodeURIComponent(hostSlug)}/campaigns/${encodeURIComponent(campaign.slug)}${viewer === 'shop' ? '?from=shop' : ''}`
  return (
    <Link
      to={to}
      style={S.card}
      aria-label={`เปิดกิจกรรม ${campaign.title}`}
    >
      <div style={S.imageWrap}>
        <ImagePlaceholder aspectRatio="4 / 3" src={campaign.cover_url} alt="" />
      </div>
      <div style={S.body}>
        <h3 style={S.title}>{campaign.title}</h3>
        <p style={S.expiry}>{formatExpiry(campaign.ends_at)}</p>
        <span style={S.remaining}>
          {remainingLabel(campaign.days_remaining, campaign.status, campaign.starts_at)}
        </span>
      </div>
    </Link>
  )
}

const S: Record<string, React.CSSProperties> = {
  card: {
    display: 'block',
    minWidth: 0,
    overflow: 'hidden',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    boxShadow: 'var(--shadow-sm)',
  },
  imageWrap: {
    padding: '16px 16px 0',
  },
  body: {
    padding: '12px 16px 14px',
  },
  title: {
    minHeight: 46,
    margin: 0,
    fontFamily: 'var(--font-brand)',
    fontSize: 'var(--body1-size)',
    lineHeight: 1.35,
    fontWeight: 800,
  },
  expiry: {
    margin: '7px 0 10px',
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body2-size)',
    whiteSpace: 'nowrap',
  },
  remaining: {
    display: 'block',
    overflow: 'hidden',
    padding: '8px 8px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
    fontSize: 'var(--body2-size)',
    fontWeight: 800,
    lineHeight: 1,
    textAlign: 'center',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
