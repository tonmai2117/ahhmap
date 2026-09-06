import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { CoinIcon } from '../components/CoinIcon'
import { Icon } from '../components/Icon'
import { PlayerAvatar } from '../components/PlayerAvatar'
import type { LineProfile } from '../components/LineProfileCard'
import { Button, Empty, Spinner } from '../components/ui'
import { getProfile } from '../liff'
import type { LeaderboardEntry, LeaderboardResponse, ProfileResponse } from '../types'
import { userFacingError } from '../utils/errors'
import { formatThaiDate } from '../utils/format'

type View = 'profile' | 'leaderboard'

export default function Profile() {
  const [view, setView] = useState<View>('profile')
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null)
  const [board, setBoard] = useState<LeaderboardResponse | null>(null)
  const [lineProfile, setLineProfile] = useState<LineProfile>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [toggleFocused, setToggleFocused] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [prof, lb] = await Promise.all([
        api.get<ProfileResponse>('/profile'),
        api.get<LeaderboardResponse>('/leaderboard'),
      ])
      setProfileData(prof)
      setBoard(lb)
      setLoadError('')
    } catch (err) {
      setLoadError(userFacingError(err, 'โหลดโปรไฟล์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    getProfile()
      .then(setLineProfile)
      .catch(() => {})
  }, [])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  if (loading) return <Spinner />

  const meRank = board?.me.rank ?? profileData?.host_rank ?? null
  const displayName = lineProfile?.displayName || 'ผู้เล่น'
  const pictureUrl = lineProfile?.pictureUrl

  return (
    <div style={S.page}>
      {view === 'profile' ? (
        <>
          <button
            type="button"
            onClick={() => setView('leaderboard')}
            style={{
              ...S.toggleCircle,
              ...(toggleFocused ? S.toggleCircleFocus : {}),
            }}
            aria-label="Switch to leaderboard"
            onFocus={() => setToggleFocused(true)}
            onBlur={() => setToggleFocused(false)}
          >
            <Icon name="trophy" size={18} />
          </button>

          <div style={S.avatarSection}>
            <div style={S.avatarOuter}>
              <PlayerAvatar
                src={pictureUrl}
                alt={`รูปโปรไฟล์ของ ${displayName}`}
                size={112}
                iconSize={48}
                style={S.avatarInner}
                fallbackStyle={S.avatarFallback}
              />
              <span style={S.onlineDot} aria-hidden="true" />
            </div>

            <h2 style={S.displayName}>{displayName}</h2>

            <div style={S.statRow}>
              <HeaderStat label="Host Ranks" value={meRank == null ? '\u2014' : meRank} />
              <HeaderStat label="Today Portals" value={profileData?.portals_today ?? 0} />
              <HeaderStat label="Total Portals" value={profileData?.portals_total ?? 0} />
            </div>
          </div>

          <div style={S.tabStrip}>
            <span style={S.tabBtnActive}>Stats</span>
            <span style={S.tabBtnDisabled}>Badges</span>
            <span style={S.tabBtnDisabled}>Passport</span>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setView('profile')}
            style={{
              ...S.toggleCircle,
              ...(toggleFocused ? S.toggleCircleFocus : {}),
            }}
            aria-label="Switch to profile"
            onFocus={() => setToggleFocused(true)}
            onBlur={() => setToggleFocused(false)}
          >
            <Icon name="user" size={18} />
          </button>
        </>
      )}

      <main style={S.content}>
        {loadError && (
          <div style={S.errorBox}>
            <p style={S.errorText}>{loadError}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'กำลังโหลด\u2026' : 'ลองใหม่'}
            </Button>
          </div>
        )}

        {view === 'profile' && profileData && (
          <div style={S.cardGrid}>
            <div style={{ ...S.infoCard, ...S.balanceCard }}>
              <div style={S.cardHead}>
                <CoinIcon size={22} />
                <span style={S.cardLabel}>เหรียญคงเหลือ</span>
              </div>
              <p style={S.cardValueOrange}>{profileData.coin_balance}</p>
            </div>

            <div style={S.infoCard}>
              <div style={S.cardHead}>
                <span style={S.cardIcon}><Icon name="wallet" size={18} /></span>
                <span style={S.cardLabel}>คูปองในกระเป๋า</span>
              </div>
              <p style={S.cardValue}>{profileData.active_coupons}</p>
            </div>

            <div style={S.infoCard}>
              <div style={S.cardHead}>
                <span style={S.cardIcon}><Icon name="check" size={18} /></span>
                <span style={S.cardLabel}>คูปองที่ใช้แล้ว</span>
              </div>
              <p style={S.cardValue}>{profileData.used_coupons}</p>
            </div>

            <div style={S.infoCard}>
              <div style={S.cardHead}>
                <span style={S.cardIcon}><Icon name="star" size={18} /></span>
                <span style={S.cardLabel}>วันที่สมัครสมาชิก</span>
              </div>
              <p style={S.cardDate}>{formatThaiDate(profileData.join_date)}</p>
            </div>
          </div>
        )}

        {view === 'leaderboard' && board && (
          <LeaderboardView board={board} />
        )}
      </main>
    </div>
  )
}

function HeaderStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={S.headerStat}>
      <span style={S.headerStatValue}>{value}</span>
      <span style={S.headerStatLabel}>{label}</span>
    </div>
  )
}

function LeaderboardView({ board }: { board: LeaderboardResponse }) {
  const { entries, me } = board
  if (entries.length === 0) return <Empty text="ยังไม่มีผู้เล่นบนกระดานอันดับ" />

  const first = entries[0]
  const second = entries.length > 1 ? entries[1] : null
  const third = entries.length > 2 ? entries[2] : null

  return (
    <>
      <div style={S.podium}>
        {second && (
          <PodiumEntry
            entry={second}
            meUserId={me.user_id}
            size="sm"
          />
        )}
        {first && (
          <PodiumEntry
            entry={first}
            meUserId={me.user_id}
            size="lg"
          />
        )}
        {third && (
          <PodiumEntry
            entry={third}
            meUserId={me.user_id}
            size="xs"
          />
        )}
      </div>

      <div style={S.leaderboardList}>
        <div style={S.listHeader}>
          <div style={S.listHeaderPos}>Position</div>
          <div style={S.listHeaderTag}>Gamer Tag</div>
          <div style={S.listHeaderScore}>Portals</div>
        </div>

        <div style={S.listBody} data-testid="leaderboard-rows">
          {entries.map((e) => (
            <LeaderboardRow key={e.user_id} entry={e} meUserId={me.user_id} />
          ))}
        </div>
      </div>
    </>
  )
}

function PodiumEntry({
  entry,
  meUserId,
  size,
}: {
  entry: LeaderboardEntry
  meUserId: string
  size: 'xs' | 'sm' | 'lg'
}) {
  const mine = entry.user_id === meUserId
  const isLg = size === 'lg'
  const avatarSize = isLg ? 96 : size === 'sm' ? 64 : 56

  return (
    <div style={S.podiumCell}>
      <PlayerAvatar
        src={entry.picture_url}
        alt={`รูปโปรไฟล์ของ ${entry.display_name}`}
        size={avatarSize}
        iconSize={isLg ? 36 : 24}
        style={S.podiumAvatar}
      />
      <span style={{ ...S.podiumName, ...(mine ? S.mineText : {}) }}>
        {entry.display_name}{mine ? ' (คุณ)' : ''}
      </span>
      <div style={S.podiumScoreBox}>
        <CoinIcon size={isLg ? 18 : 14} />
        <span style={S.podiumScore}>{entry.portals}</span>
      </div>
    </div>
  )
}

function LeaderboardRow({
  entry,
  meUserId,
}: {
  entry: LeaderboardEntry
  meUserId: string
}) {
  const mine = entry.user_id === meUserId
  return (
    <div style={{ ...S.listRow, ...(mine ? S.listRowMine : {}) }}>
      <div style={S.listRowPos}>{entry.rank}</div>
      <PlayerAvatar
        src={entry.picture_url}
        alt={`รูปโปรไฟล์ของ ${entry.display_name}`}
        size={32}
        iconSize={18}
        style={S.listRowAvatar}
      />
      <div style={{ ...S.listRowName, ...(mine ? S.mineText : {}) }}>
        {entry.display_name}{mine ? ' (คุณ)' : ''}
      </div>
      <div style={S.listRowScore}>
        <CoinIcon size={16} />
        <span>{entry.portals}</span>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    position: 'relative',
    maxWidth: 430,
    margin: '0 auto',
    minHeight: '100vh',
    width: '100%',
    background: 'var(--background-secondary)',
    paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
    overflow: 'hidden',
  },

  toggleCircle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: '#fff',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
  toggleCircleFocus: {
    outline: '2px solid var(--primary)',
    outlineOffset: 2,
  },

  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingLeft: 16,
    paddingRight: 16,
  },
  avatarOuter: {
    position: 'relative',
    width: 112,
    height: 112,
    flexShrink: 0,
  },
  avatarInner: {
    width: 112,
    height: 112,
    borderRadius: '50%',
    background: '#fff',
    border: '3px solid #fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--fill-subtle)',
    color: 'var(--text-tertiary)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'var(--line-green)',
    border: '3px solid var(--background-secondary)',
    zIndex: 2,
  },
  displayName: {
    marginTop: 16,
    fontSize: 'var(--title2-size)',
    fontWeight: 800,
    color: 'var(--text-primary)',
    maxWidth: 220,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  },
  statRow: {
    display: 'flex',
    gap: 24,
    marginTop: 20,
  },
  headerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  headerStatValue: {
    fontSize: 'clamp(16px, 4.5vw, 20px)',
    fontWeight: 800,
    lineHeight: 1,
    color: 'var(--text-primary)',
    minWidth: 0,
    wordBreak: 'break-all',
  },
  headerStatLabel: {
    fontSize: 'var(--body4-size)',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },

  tabStrip: {
    display: 'flex',
    gap: 40,
    justifyContent: 'center',
    borderBottom: '1px solid var(--divider)',
    paddingBottom: 12,
    marginBottom: 20,
    paddingLeft: 16,
    paddingRight: 16,
  },
  tabBtnActive: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid var(--primary)',
    paddingBottom: 10,
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  tabBtnDisabled: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    paddingBottom: 10,
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    opacity: 0.6,
  },

  content: {
    display: 'grid',
    gap: 12,
    padding: '0 16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '16px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-sm)',
    minWidth: 0,
  },
  balanceCard: {
    borderLeft: '4px solid var(--primary)',
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
    flexShrink: 0,
  },
  cardLabel: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--body3-size)',
    fontWeight: 700,
  },
  cardValue: {
    fontSize: 'clamp(18px, 5.5vw, 28px)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: 'var(--text-primary)',
    minWidth: 0,
    wordBreak: 'break-all',
  },
  cardValueOrange: {
    fontSize: 'clamp(18px, 5.5vw, 28px)',
    fontWeight: 800,
    lineHeight: 1.1,
    color: 'var(--primary)',
    minWidth: 0,
    wordBreak: 'break-all',
  },
  cardDate: {
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  podium: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 32,
    paddingBottom: 16,
    paddingLeft: 8,
    paddingRight: 8,
  },
  podiumCell: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    maxWidth: 120,
    minWidth: 0,
  },
  podiumAvatar: {
    borderRadius: '50%',
    background: '#fff',
    border: '3px solid #fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    flexShrink: 0,
  },
  podiumName: {
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    minWidth: 0,
  },
  podiumScoreBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: '#fff',
    borderRadius: 'var(--radius-full)',
    padding: '4px 12px',
    boxShadow: 'var(--shadow-sm)',
    maxWidth: '100%',
    minWidth: 0,
  },
  podiumScore: {
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontSize: 'clamp(12px, 3.5vw, 18px)',
    whiteSpace: 'nowrap',
  },
  mineText: {
    color: 'var(--primary)',
  },

  leaderboardList: {
    background: 'var(--surface)',
    borderRadius: '24px 24px 12px 12px',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    marginTop: 4,
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--primary)',
    color: '#fff',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  listHeaderPos: {
    width: 48,
    textAlign: 'center',
    flexShrink: 0,
  },
  listHeaderTag: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  listHeaderScore: {
    width: 80,
    textAlign: 'right',
    flexShrink: 0,
    minWidth: 0,
  },
  listBody: {
    maxHeight: 320,
    overflowY: 'auto',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--divider)',
  },
  listRowMine: {
    background: 'var(--fill-subtle)',
  },
  listRowPos: {
    width: 48,
    textAlign: 'center',
    fontSize: 'var(--body2-size)',
    fontWeight: 800,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  listRowAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--fill-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-tertiary)',
    flexShrink: 0,
    marginLeft: 12,
  },
  listRowName: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  listRowScore: {
    width: 80,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    fontSize: 'var(--body2-size)',
    fontWeight: 800,
    color: 'var(--text-primary)',
    flexShrink: 0,
    minWidth: 0,
  },

  errorBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    background: '#fff4ef',
    border: '1px solid rgba(239,81,40,.22)',
    borderRadius: 'var(--radius-md)',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: 'var(--danger)',
    fontSize: 'var(--body3-size)',
    fontWeight: 700,
    lineHeight: 1.45,
  },
}
