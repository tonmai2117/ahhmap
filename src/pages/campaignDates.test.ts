import { describe, expect, it } from 'vitest'
import { formatExpiry, formatRange, remainingLabel } from './campaignDates'

const START = '2026-10-28T17:00:00.000Z'
const END = '2026-10-31T16:59:59.999Z'

describe('campaign date presentation', () => {
  it('formats dates in Asia/Bangkok using the campaign end date for expiry', () => {
    expect(formatExpiry(END)).toBe('EXP. 31/10/2026')
    expect(formatRange(START, END)).toBe('29/10/2026 - 31/10/2026')
  })

  it('labels server-computed remaining calendar days', () => {
    expect(remainingLabel(3, 'active', START)).toBe('เหลืออีก 3 วัน')
    expect(remainingLabel(1, 'active', START)).toBe('เหลืออีก 1 วัน')
    expect(remainingLabel(0, 'active', START)).toBe('วันสุดท้าย')
    expect(remainingLabel(-1, 'ended', START)).toBe('สิ้นสุดแล้ว')
    expect(remainingLabel(10, 'upcoming', START)).toBe('เริ่ม 29/10/2026')
  })
})
