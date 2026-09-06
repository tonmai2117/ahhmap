import { describe, expect, it } from 'vitest'
import { safeNext } from './registerNext'

describe('safeNext', () => {
  it('accepts same-origin absolute paths and preserves query strings', () => {
    expect(safeNext('/map')).toBe('/map')
    expect(safeNext('/hosts/demo/campaigns/autumn?from=share')).toBe(
      '/hosts/demo/campaigns/autumn?from=share',
    )
  })

  it('returns null when no return path was supplied', () => {
    expect(safeNext(null)).toBeNull()
  })

  it.each([
    '//evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '\\evil',
    '/path:with-colon',
    '',
    `/${'a'.repeat(512)}`,
  ])('rejects unsafe return path %s', (value) => {
    expect(safeNext(value)).toBeNull()
  })
})
