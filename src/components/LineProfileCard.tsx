import { Icon } from './Icon'

export type LineProfile = {
  displayName: string
  pictureUrl?: string
} | null

type LineProfileCardProps = {
  profile: LineProfile
  variant?: 'default' | 'compact'
  showBadge?: boolean
  badgeLabel?: string
  style?: React.CSSProperties
}

export function LineProfileCard({
  profile,
  variant = 'default',
  showBadge = true,
  badgeLabel = 'Signed in with LINE',
  style,
}: LineProfileCardProps) {
  const compact = variant === 'compact'
  const displayName = profile?.displayName || 'ผู้เล่น'

  return (
    <section
      aria-label="โปรไฟล์ LINE"
      style={{
        ...S.card,
        ...(compact ? S.compactCard : {}),
        ...style,
      }}
    >
      {profile?.pictureUrl ? (
        <img
          src={profile.pictureUrl}
          alt={`รูปโปรไฟล์ของ ${displayName}`}
          style={{
            ...S.avatar,
            ...(compact ? S.compactAvatar : {}),
          }}
        />
      ) : (
        <div
          style={{
            ...S.avatarFallback,
            ...(compact ? S.compactAvatar : {}),
          }}
        >
          <Icon name="user" size={compact ? 20 : 28} />
        </div>
      )}

      <div style={{ minWidth: 0, flex: 1 }}>
        {showBadge && (
          <div
            style={{
              ...S.lineBadge,
              ...(compact ? S.compactLineBadge : {}),
            }}
          >
            <span
              style={{
                ...S.lineMark,
                ...(compact ? S.compactLineMark : {}),
              }}
            >
              L
            </span>
            {badgeLabel}
          </div>
        )}
        <p
          style={{
            ...S.profileName,
            ...(compact ? S.compactProfileName : {}),
            ...(!showBadge ? S.noBadgeProfileName : {}),
          }}
        >
          {displayName}
        </p>
      </div>
    </section>
  )
}

const S: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 16,
    background: 'var(--surface)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
  },
  compactCard: {
    width: '100%',
    boxSizing: 'border-box',
    gap: 10,
    padding: '8px 10px',
    marginBottom: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--line-green)',
  },
  avatarFallback: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: 'var(--line-green)',
    border: '3px solid var(--line-green)',
  },
  compactAvatar: {
    width: 40,
    height: 40,
  },
  lineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: 'var(--line-green)',
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 5,
    whiteSpace: 'nowrap',
  },
  compactLineBadge: {
    gap: 5,
    fontSize: 10,
    marginBottom: 2,
  },
  lineMark: {
    width: 16,
    height: 16,
    borderRadius: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--line-green)',
    color: '#fff',
    fontSize: 10,
  },
  compactLineMark: {
    width: 14,
    height: 14,
    fontSize: 9,
  },
  profileName: {
    fontSize: 'var(--body1-size)',
    fontWeight: 800,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  compactProfileName: {
    fontSize: 'var(--body2-size)',
  },
}
