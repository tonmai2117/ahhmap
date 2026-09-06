import { describe, expect, it } from 'vitest'
import type { CampaignParticipation, CampaignStatus } from '../types'
import { campaignJoinCtaState } from './CampaignJoinCTA'

const NOT_JOINED: CampaignParticipation = {
  joined: false,
  joined_at: null,
  last_active_at: null,
}

const JOINED: CampaignParticipation = {
  joined: true,
  joined_at: '2026-10-29T02:30:00.000Z',
  last_active_at: null,
}

const PLAYED: CampaignParticipation = {
  ...JOINED,
  last_active_at: '2026-10-30T02:30:00.000Z',
}

describe('campaignJoinCtaState', () => {
  it.each<{
    status: CampaignStatus
    participation: CampaignParticipation
    busy: boolean
    label: string
    disabled: boolean
  }>([
    { status: 'active', participation: NOT_JOINED, busy: false, label: 'เข้าร่วมเลย', disabled: false },
    { status: 'active', participation: JOINED, busy: false, label: 'เริ่มเล่น', disabled: false },
    { status: 'active', participation: PLAYED, busy: false, label: 'เล่นต่อ', disabled: false },
    { status: 'upcoming', participation: NOT_JOINED, busy: false, label: 'เร็วๆ นี้', disabled: true },
    { status: 'upcoming', participation: JOINED, busy: false, label: 'เร็วๆ นี้', disabled: true },
    { status: 'ended', participation: NOT_JOINED, busy: false, label: 'กิจกรรมสิ้นสุดแล้ว', disabled: true },
    { status: 'ended', participation: JOINED, busy: false, label: 'ดูแผนที่กิจกรรม', disabled: false },
    { status: 'active', participation: NOT_JOINED, busy: true, label: 'กำลังเข้าร่วม...', disabled: true },
  ])('$status / joined=$participation.joined / busy=$busy', ({ status, participation, busy, label, disabled }) => {
    expect(campaignJoinCtaState(status, participation, busy)).toEqual({ label, disabled })
  })
})
