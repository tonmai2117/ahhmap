import { useEffect, useState } from 'react'

// Single source of truth for the splash background. index.html paints this same
// gradient before the bundle has even parsed; a drift between the two would
// re-introduce a visible colour change at handoff, so a test asserts they match.
export const SPLASH_BACKGROUND =
  'radial-gradient(120% 90% at 30% 12%, #ff8a5c 0%, #ef5128 46%, #c9381a 100%)'

export default function Splash({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false)

  // Hand off from the static boot splash in index.html. Removing it from an
  // effect (not before render) guarantees this component is already committed,
  // so there is no frame where neither splash is on screen.
  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
  }, [])

  return (
    <div style={S.page}>
      <div style={S.lightLayer} />
      <div style={S.content}>
        <div style={S.logoWrap}>
          <div style={S.logoRing} />
          {!logoFailed ? (
            <img
              src="/brand/aahhmap-logo.png"
              alt="AahhMap"
              onError={() => setLogoFailed(true)}
              style={S.logo}
            />
          ) : (
            <div style={S.logoFallback}>A</div>
          )}
        </div>
        <h1 style={S.title}>AahhMap</h1>
        <p style={S.subtitle}>Location-based content</p>
        <p style={S.byline}>Augmented Reality Lab</p>
        {error && (
          <div style={S.errorBox}>
            <p style={S.errorTitle}>เปิดผ่านแอป LINE เท่านั้น</p>
            <p style={S.errorMessage}>{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry} style={S.retryButton}>
                ลองใหม่อีกครั้ง
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: SPLASH_BACKGROUND,
    color: '#fff',
  },
  lightLayer: {
    position: 'absolute',
    inset: 0,
    opacity: 0.16,
    background:
      'radial-gradient(circle at 20% 20%,#fff 0,transparent 22%), radial-gradient(circle at 82% 32%,#fff 0,transparent 16%), radial-gradient(circle at 65% 80%,#fff 0,transparent 20%)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
  },
  logoWrap: {
    position: 'relative',
    width: 150,
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    animation: 'aahh-float 3.6s ease-in-out infinite',
  },
  logoRing: {
    position: 'absolute',
    inset: -14,
    border: '2px dashed rgba(255,255,255,.5)',
    borderRadius: '50%',
    animation: 'aahh-glowspin 14s linear infinite',
  },
  logo: {
    width: 128,
    height: 128,
    objectFit: 'contain',
  },
  logoFallback: {
    width: 128,
    height: 128,
    borderRadius: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,.16)',
    border: '1px solid rgba(255,255,255,.35)',
    fontFamily: 'var(--font-brand)',
    fontSize: 72,
    fontWeight: 800,
  },
  title: {
    fontFamily: 'var(--font-brand)',
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: '-.5px',
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: 600,
    color: 'rgba(255,255,255,.9)',
  },
  byline: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,.7)',
  },
  errorBox: {
    width: '100%',
    maxWidth: 320,
    marginTop: 32,
    padding: 18,
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(0,0,0,.2)',
    border: '1px solid rgba(255,255,255,.22)',
    backdropFilter: 'blur(12px)',
  },
  errorTitle: {
    fontSize: 'var(--title3-size)',
    fontWeight: 800,
  },
  errorMessage: {
    marginTop: 6,
    fontSize: 'var(--body3-size)',
    lineHeight: 1.5,
    color: 'rgba(255,255,255,.82)',
  },
  retryButton: {
    width: '100%',
    height: 44,
    marginTop: 14,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    background: '#fff',
    color: 'var(--primary)',
    fontWeight: 800,
  },
}
