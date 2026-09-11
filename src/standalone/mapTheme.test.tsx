import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useMapTheme } from '../hooks/useMapTheme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})
afterEach(cleanup)

describe('map theme', () => {
  it('starts light and remembers a dark choice', () => {
    const first = renderHook(() => useMapTheme())
    expect(first.result.current.theme).toBe('light')
    act(() => first.result.current.setTheme('dark'))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('aahhmap-theme')).toBe('dark')
    first.unmount()
    const second = renderHook(() => useMapTheme())
    expect(second.result.current.theme).toBe('dark')
  })
})
