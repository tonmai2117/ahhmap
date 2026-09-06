import { Button } from './ui'
import { CoinIcon } from './CoinIcon'

export function SuccessScreen({
  coins,
  treasureName,
  onContinue,
}: {
  coins: number
  treasureName: string | null
  onContinue: () => void
}) {
  return (
    <div style={S.successPage}>
      <div style={S.successGlow} />
      <div style={S.successContent}>
        <div style={S.coinStage}>
          <div style={S.coinPulse} />
          <CoinIcon size={132} style={{ position: 'relative', zIndex: 2, boxShadow: '0 12px 34px rgba(239,156,40,.55)' }} />
          <span style={{ ...S.risingCoin, width: 16, height: 16, left: 28, animationDelay: '0s' }} />
          <span style={{ ...S.risingCoin, width: 12, height: 12, right: 22, animationDelay: '.4s', background: '#ffe9ad' }} />
          <span style={{ ...S.risingCoin, width: 10, height: 10, left: 76, animationDelay: '.8s' }} />
        </div>
        <h1 style={S.successTitle}>สำเร็จ!</h1>
        {treasureName && <p style={S.successName}>{treasureName}</p>}
        <div style={S.coinChip}>+{coins} เหรียญ</div>
        <Button size="lg" fullWidth onClick={onContinue} style={{ maxWidth: 300, marginTop: 34 }}>
          เดินทางต่อ
        </Button>
      </div>
    </div>
  )
}

export function Overlay({ children, dim = 'rgba(0,0,0,0.78)' }: { children: React.ReactNode; dim?: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: dim,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      {children}
    </div>
  )
}

export function ArButton({
  children, onClick, color, outline,
}: {
  children: React.ReactNode
  onClick?: () => void
  color: string
  outline?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', maxWidth: 300, padding: '16px 0', marginBottom: 12,
        borderRadius: 'var(--radius-lg)', border: outline ? '2px solid rgba(255,255,255,0.5)' : 'none',
        background: color, color: 'white', fontSize: 18, fontWeight: 700, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

const S: Record<string, React.CSSProperties> = {
  successPage: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    background: 'radial-gradient(120% 90% at 50% 12%, #3a2418 0%, #241a14 42%, #191b20 100%)',
    color: '#fff',
  },
  successGlow: {
    position: 'absolute',
    inset: 0,
    opacity: 0.2,
    background: 'radial-gradient(circle at 50% 24%, #ef5128 0, transparent 46%)',
  },
  successContent: {
    position: 'relative',
    zIndex: 1,
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    textAlign: 'center',
  },
  coinStage: {
    position: 'relative',
    width: 132,
    height: 132,
    marginBottom: 28,
    animation: 'aahh-pop .5s ease-out',
  },
  coinPulse: {
    position: 'absolute',
    inset: -18,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(239,81,40,.4) 0, transparent 66%)',
    animation: 'aahh-pulse 2.4s ease-in-out infinite',
  },
  risingCoin: {
    position: 'absolute',
    bottom: 20,
    borderRadius: '50%',
    background: '#ffd76a',
    animation: 'aahh-coin-rise 1.55s ease-out infinite',
  },
  successTitle: {
    fontSize: 'var(--display-3)',
    fontWeight: 800,
    lineHeight: 1.1,
  },
  successName: {
    marginTop: 10,
    color: 'rgba(255,255,255,.8)',
    fontSize: 'var(--body1-size)',
  },
  coinChip: {
    marginTop: 18,
    padding: '7px 18px',
    borderRadius: 'var(--radius-full)',
    background: 'rgba(255,255,255,.14)',
    color: '#ffd76a',
    fontWeight: 800,
  },
}
