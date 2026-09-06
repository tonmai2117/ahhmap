import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { FriendGate } from './components/FriendGate'
import {
  checkLineOaFriendship,
  initLiff,
  openLineOaProfile,
  readCachedFriendship,
  requestLineOaFriendship,
} from './liff'
import Splash from './pages/Splash'

// `booting` covers everything that must happen before the app can render —
// liff.init() AND the first friendship check — so the splash is the single
// screen on display for the whole boot. `gateChecking` is the same network
// call, but triggered by the user from the gate, where replacing the gate with
// the splash would itself be a flicker. Splitting by origin is what keeps the
// boot sequence to one surface.
type Phase =
  | 'booting'
  | 'gateChecking'
  | 'friendRequired'
  | 'friendError'
  | 'ready'
  | 'error'

export function Root() {
  const [phase, setPhase] = React.useState<Phase>('booting')
  const [error, setError] = React.useState('')

  const checkFriendship = React.useCallback(async (origin: 'boot' | 'gate') => {
    setPhase(origin === 'boot' ? 'booting' : 'gateChecking')
    setError('')
    try {
      const isFriend = await checkLineOaFriendship()
      setPhase(isFriend ? 'ready' : 'friendRequired')
    } catch (err: unknown) {
      console.warn('LINE friendship check failed', err)
      setError('ตรวจสอบสถานะเพื่อนไม่สำเร็จ กรุณาลองใหม่ หรือติดต่อผู้ดูแลระบบ')
      setPhase('friendError')
    }
  }, [])

  // Background confirmation for the optimistic path: never blocks the UI and
  // only ever downgrades a returning friend back to the gate. A transient check
  // failure is ignored — the API still enforces friendship on every request.
  const revalidateFriendship = React.useCallback(async () => {
    try {
      const isFriend = await checkLineOaFriendship()
      if (!isFriend) setPhase('friendRequired')
    } catch (err: unknown) {
      console.warn('Background LINE friendship revalidation failed', err)
    }
  }, [])

  const boot = React.useCallback(() => {
    setPhase('booting')
    setError('')
    initLiff()
      .then((initialized) => {
        if (!initialized) return
        // Returning friend: enter immediately from the local cache and confirm
        // in the background, so the gate no longer flashes on every page load.
        if (readCachedFriendship()) {
          setPhase('ready')
          void revalidateFriendship()
          return
        }
        return checkFriendship('boot')
      })
      .catch((err: unknown) => {
        console.warn('LIFF initialization failed', err)
        setError('กรุณาเปิดหน้านี้ผ่านแอป LINE แล้วลองใหม่')
        setPhase('error')
      })
  }, [checkFriendship, revalidateFriendship])

  React.useEffect(() => { boot() }, [boot])

  React.useEffect(() => {
    const requireFriend = () => setPhase('friendRequired')
    window.addEventListener('line-friend-required', requireFriend)
    return () => window.removeEventListener('line-friend-required', requireFriend)
  }, [])

  React.useEffect(() => {
    if (phase !== 'friendRequired' && phase !== 'friendError') return

    const recheckOnFocus = () => {
      if (document.visibilityState === 'visible') void checkFriendship('gate')
    }
    window.addEventListener('focus', recheckOnFocus)
    document.addEventListener('visibilitychange', recheckOnFocus)
    return () => {
      window.removeEventListener('focus', recheckOnFocus)
      document.removeEventListener('visibilitychange', recheckOnFocus)
    }
  }, [checkFriendship, phase])

  const addFriend = React.useCallback(async () => {
    setPhase('gateChecking')
    setError('')
    try {
      const isFriend = await requestLineOaFriendship()
      setPhase(isFriend ? 'ready' : 'friendRequired')
    } catch (err: unknown) {
      console.warn('Native LINE friendship prompt unavailable; opening OA profile', err)
      try {
        openLineOaProfile()
        setPhase('friendRequired')
      } catch (openError: unknown) {
        console.warn('LINE OA profile could not be opened', openError)
        setError('เปิดหน้าเพิ่มเพื่อนไม่สำเร็จ กรุณาลองใหม่')
        setPhase('friendError')
      }
    }
  }, [])

  if (phase === 'ready') {
    return (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
  }

  if (
    phase === 'friendRequired' ||
    phase === 'friendError' ||
    phase === 'gateChecking'
  ) {
    return (
      <FriendGate
        checking={phase === 'gateChecking'}
        error={phase === 'friendError' ? error : undefined}
        onAddFriend={() => { void addFriend() }}
        onRetry={() => { void checkFriendship('gate') }}
      />
    )
  }

  return <Splash error={phase === 'error' ? error : undefined} onRetry={phase === 'error' ? boot : undefined} />
}
