import type { CampaignParticipation, CampaignStatus } from '../types'
import { Button } from './ui'

export function campaignJoinCtaState(
  status: CampaignStatus,
  participation: CampaignParticipation,
  busy: boolean,
): { disabled: boolean; label: string } {
  const canEnterMap = participation.joined && status !== 'upcoming'
  const disabled = busy || (!canEnterMap && status !== 'active')
  const label = busy
    ? 'กำลังเข้าร่วม...'
    : status === 'upcoming'
      ? 'เร็วๆ นี้'
      : status === 'ended'
        ? (participation.joined ? 'ดูแผนที่กิจกรรม' : 'กิจกรรมสิ้นสุดแล้ว')
        : !participation.joined
          ? 'เข้าร่วมเลย'
          : participation.last_active_at
            ? 'เล่นต่อ'
            : 'เริ่มเล่น'

  return { disabled, label }
}

export function CampaignJoinCTA({
  status,
  participation,
  busy,
  onClick,
}: {
  status: CampaignStatus
  participation: CampaignParticipation
  busy: boolean
  onClick: () => void
}) {
  const { disabled, label } = campaignJoinCtaState(status, participation, busy)

  return (
    <div style={S.bar}>
      <Button
        type="button"
        size="lg"
        fullWidth
        disabled={disabled}
        onClick={onClick}
        style={S.button}
      >
        {label}
      </Button>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    position: 'sticky',
    bottom: 0,
    zIndex: 20,
    padding: '12px 10px calc(12px + env(safe-area-inset-bottom))',
    borderTop: '1px solid var(--divider)',
    background: 'var(--surface)',
  },
  button: {
    minHeight: 60,
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--body1-size)',
    fontWeight: 800,
  },
}
