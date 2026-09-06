import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { liffApi } = vi.hoisted(() => ({
  liffApi: {
    initLiff: vi.fn(),
    readCachedFriendship: vi.fn(),
    checkLineOaFriendship: vi.fn(),
    requestLineOaFriendship: vi.fn(),
    openLineOaProfile: vi.fn(),
  },
}))

vi.mock('./liff', () => liffApi)
// App pulls in leaflet, leaflet-routing-machine and three; the boot sequence is
// what is under test, so the routed app is stubbed to a marker element.
vi.mock('./App', () => ({ default: () => <div data-testid="app" /> }))

const { Root } = await import('./Root')

const SPLASH_MARKER = 'Location-based content'
const GATE_MARKER = 'เพิ่มเพื่อน LINE Official Account'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Root boot sequence', () => {
  it('keeps the splash on screen while the boot-time friendship check is in flight', async () => {
    const check = deferred<boolean>()
    liffApi.initLiff.mockResolvedValue(true)
    liffApi.readCachedFriendship.mockReturnValue(false)
    liffApi.checkLineOaFriendship.mockReturnValue(check.promise)

    render(<Root />)

    await waitFor(() => expect(liffApi.checkLineOaFriendship).toHaveBeenCalled())

    expect(screen.getByText(SPLASH_MARKER)).toBeTruthy()
    expect(screen.queryByText(GATE_MARKER)).toBeNull()

    check.resolve(true)
    await waitFor(() => expect(screen.getByTestId('app')).toBeTruthy())
  })

  it('shows the friend gate only once the boot check reports a non-friend', async () => {
    liffApi.initLiff.mockResolvedValue(true)
    liffApi.readCachedFriendship.mockReturnValue(false)
    liffApi.checkLineOaFriendship.mockResolvedValue(false)

    render(<Root />)

    await waitFor(() => expect(screen.getByText(GATE_MARKER)).toBeTruthy())
    expect(screen.queryByText(SPLASH_MARKER)).toBeNull()
  })

  it('keeps the friend gate mounted while a gate-initiated re-check runs', async () => {
    liffApi.initLiff.mockResolvedValue(true)
    liffApi.readCachedFriendship.mockReturnValue(false)
    liffApi.checkLineOaFriendship.mockResolvedValue(false)

    render(<Root />)
    await waitFor(() => expect(screen.getByText(GATE_MARKER)).toBeTruthy())

    const recheck = deferred<boolean>()
    liffApi.checkLineOaFriendship.mockReturnValue(recheck.promise)
    await userEvent.click(screen.getByText('เพิ่มแล้ว ตรวจสอบอีกครั้ง'))

    expect(screen.getByText(GATE_MARKER)).toBeTruthy()
    expect(screen.getByText('กำลังตรวจสอบ...')).toBeTruthy()
    expect(screen.queryByText(SPLASH_MARKER)).toBeNull()

    recheck.resolve(true)
    await waitFor(() => expect(screen.getByTestId('app')).toBeTruthy())
  })

  it('enters the app straight from the friendship cache without a gate frame', async () => {
    liffApi.initLiff.mockResolvedValue(true)
    liffApi.readCachedFriendship.mockReturnValue(true)
    liffApi.checkLineOaFriendship.mockResolvedValue(true)

    render(<Root />)

    await waitFor(() => expect(screen.getByTestId('app')).toBeTruthy())
    expect(screen.queryByText(GATE_MARKER)).toBeNull()
  })
})
