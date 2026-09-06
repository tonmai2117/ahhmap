import type { CampaignStatus } from '../types'
import { formatThaiShortDate } from '../utils/format'

export function formatExpiry(endsAt: string): string {
  return `EXP. ${formatThaiShortDate(endsAt)}`
}

export function formatRange(startsAt: string, endsAt: string): string {
  return `${formatThaiShortDate(startsAt)} - ${formatThaiShortDate(endsAt)}`
}

export function remainingLabel(
  daysRemaining: number,
  status: CampaignStatus,
  startsAt?: string,
): string {
  if (status === 'upcoming') {
    return startsAt ? `เริ่ม ${formatThaiShortDate(startsAt)}` : 'เร็วๆ นี้'
  }
  if (daysRemaining > 1) return `เหลืออีก ${daysRemaining} วัน`
  if (daysRemaining === 1) return 'เหลืออีก 1 วัน'
  if (daysRemaining === 0) return 'วันสุดท้าย'
  return 'สิ้นสุดแล้ว'
}
