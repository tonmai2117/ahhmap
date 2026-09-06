import type { Host } from '../types'
import { Icon } from './Icon'
import { ImagePlaceholder } from './ImagePlaceholder'

export function HostProfileHeader({
  host,
  onShare,
  onInfo,
}: {
  host: Host
  onShare: () => void
  onInfo: () => void
}) {
  return (
    <header>
      <ImagePlaceholder
        aspectRatio="16 / 9"
        src={host.cover_url}
        alt={`ภาพปก ${host.title || host.name}`}
      />
      <div style={S.content}>
        <div style={S.logo}>
          <ImagePlaceholder size={88} shape="circle" src={host.logo_url} alt={`โลโก้ ${host.name}`} />
        </div>
        <div style={S.actions}>
          <button type="button" onClick={onShare} style={S.iconButton} aria-label="แชร์หน้า Host">
            <Icon name="route" size={22} />
          </button>
          <button type="button" onClick={onInfo} style={S.iconButton} aria-label="ดูรายการกิจกรรม">
            <span style={S.infoIcon}>i</span>
          </button>
        </div>
        <h1 style={S.title}>{host.title || host.name}</h1>
        {host.description && <p style={S.description}>{host.description}</p>}
      </div>
    </header>
  )
}

const S: Record<string, React.CSSProperties> = {
  content: {
    position: 'relative',
    padding: '52px 28px 8px',
  },
  logo: {
    position: 'absolute',
    top: -46,
    left: 28,
    padding: 3,
    borderRadius: 'var(--radius-full)',
    background: 'var(--surface)',
  },
  actions: {
    position: 'absolute',
    top: 16,
    right: 28,
    display: 'flex',
    gap: 20,
  },
  iconButton: {
    width: 50,
    height: 50,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-full)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
  },
  infoIcon: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid currentColor',
    borderRadius: 'var(--radius-full)',
    fontWeight: 800,
    fontFamily: 'serif',
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-brand)',
    fontSize: 27,
    lineHeight: 1.2,
    fontWeight: 800,
  },
  description: {
    margin: '8px 0 0',
    color: 'var(--text-primary)',
    fontSize: 'var(--body1-size)',
    lineHeight: 1.42,
  },
}
