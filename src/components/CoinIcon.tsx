export function CoinIcon({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 35% 30%, #ffd76a, #ef9c28)',
        color: '#8a5a08',
        fontWeight: 800,
        fontSize: Math.max(11, Math.round(size * 0.54)),
        lineHeight: 1,
        boxShadow: 'inset 0 -2px 0 rgba(138,90,8,.22)',
        ...style,
      }}
    >
      ฿
    </span>
  )
}
