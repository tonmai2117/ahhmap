import { describe, expect, it } from 'vitest'
import { formatDistance, pointAlongRoute, routeProgress, thaiInstruction } from '../map/navigationDomain'

describe('navigation domain', () => {
  it('formats provider maneuvers in Thai with a safe fallback', () => {
    expect(thaiInstruction({ type: 'turn', modifier: 'left' }, 'ถนนทดสอบ')).toBe('เลี้ยวซ้าย เข้าสู่ ถนนทดสอบ')
    expect(thaiInstruction({ type: 'roundabout', exit: 2 })).toBe('ใช้วงเวียน ทางออกที่ 2')
    expect(thaiInstruction({ type: 'arrive' })).toBe('ถึงปลายทางแล้ว')
    expect(thaiInstruction({ type: 'unknown' }, '<img onerror=alert(1)>')).toContain('<img onerror=alert(1)>')
  })

  it('interpolates and measures progress along route geometry', () => {
    const geometry: [number, number][] = [[100.5285, 13.7466], [100.5295, 13.7466], [100.5305, 13.7466]]
    const middle = pointAlongRoute(geometry, 108)
    expect(middle?.lng).toBeCloseTo(100.5295, 3)
    const progress = routeProgress(geometry, { lat: 13.7466, lng: 100.5295, accuracy: 10 })
    expect(progress.ratio).toBeCloseTo(0.5, 1)
    expect(progress.remainingM).toBeGreaterThan(90)
    expect(formatDistance(progress.remainingM)).toMatch(/ม\.$/)
  })
})
