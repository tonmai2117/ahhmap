import { useCallback, useRef, useState } from 'react'
import { Icon } from './Icon'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'lg'
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'sm',
  fullWidth,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  const variantStyle =
    variant === 'primary'
      ? {
          background: disabled ? 'var(--fill-strong)' : 'var(--primary-surface)',
          color: disabled ? 'var(--text-disabled)' : 'var(--on-primary)',
          border: '1px solid transparent',
        }
      : variant === 'outline'
        ? {
            background: 'transparent',
            color: disabled ? 'var(--text-disabled)' : 'var(--primary)',
            border: '1.5px solid var(--border)',
          }
        : {
            background: 'transparent',
            color: disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
            border: '1px solid transparent',
          }

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: size === 'lg' ? 48 : 36,
        padding: size === 'lg' ? '0 18px' : '8px 16px',
        width: fullWidth ? '100%' : undefined,
        borderRadius: 'var(--radius-sm)',
        fontSize: size === 'lg' ? 'var(--title4-size)' : 'var(--body2-size)',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.92 : 1,
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Tabs<T extends string>({
  value,
  tabs,
  onChange,
}: {
  value: T
  tabs: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div style={S.tabs}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          style={{
            ...S.tab,
            ...(value === tab.value ? S.tabActive : {}),
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div style={S.dialogOverlay}>
      <div style={S.dialogBox}>
        <div style={{ padding: '22px 20px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 'var(--title3-size)', fontWeight: 700, marginBottom: 8 }}>{title}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--body2-size)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
            {message}
          </p>
        </div>
        <div style={S.dialogActions}>
          <button type="button" onClick={onCancel} style={S.dialogButton}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...S.dialogButton,
              color: destructive ? 'var(--red-500)' : 'var(--primary)',
              fontWeight: 700,
              borderLeft: '1px solid var(--divider)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Toast({ message, persist }: { message: string; persist?: boolean }) {
  return (
    <div style={{ ...S.toast, bottom: persist ? 108 : 24 }}>
      {message}
    </div>
  )
}

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  const showToast = useCallback((next: string, options?: { persist?: boolean }) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    setMessage(next)
    if (!options?.persist) {
      timerRef.current = window.setTimeout(() => setMessage(null), 2400)
    }
  }, [])

  const toast = message ? <Toast message={message} /> : null
  return { toast, showToast, clearToast: () => setMessage(null) }
}

export function Chip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ ...S.chip, ...style }}>{children}</span>
}

export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'muted' | 'danger' }) {
  const toneStyle =
    tone === 'primary'
      ? { background: 'var(--fill-subtle)', color: 'var(--primary)' }
      : tone === 'danger'
        ? { background: 'rgba(255,51,75,.1)', color: 'var(--red-500)' }
        : { background: 'var(--fill)', color: 'var(--text-tertiary)' }
  return <span style={{ ...S.badge, ...toneStyle }}>{label}</span>
}

export function StatCard({
  icon,
  label,
  value,
  note,
}: {
  icon: 'user' | 'wallet' | 'check'
  label: string
  value: number
  note?: string
}) {
  return (
    <div style={S.statCard}>
      <div style={S.statIcon}>
        <Icon name={icon} size={24} />
      </div>
      <div>
        <p style={S.statValue}>{value}</p>
        <p style={S.statLabel}>{label}</p>
        {note && <p style={S.statNote}>{note}</p>}
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <div style={S.centerState}>
      <div style={S.spinner} />
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--body2-size)' }}>กำลังโหลด...</p>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '48px 0', fontSize: 'var(--body2-size)' }}>{text}</p>
}

const S: Record<string, React.CSSProperties> = {
  tabs: {
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    background: 'var(--surface)',
    borderBottom: '1px solid var(--divider)',
  },
  tab: {
    flex: 1,
    height: 48,
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'transparent',
    color: 'var(--text-tertiary)',
    fontWeight: 700,
    fontSize: 'var(--body2-size)',
  },
  tabActive: {
    color: 'var(--primary)',
    borderBottomColor: 'var(--primary)',
  },
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'var(--dim)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 300,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
  },
  dialogActions: {
    display: 'flex',
    borderTop: '1px solid var(--divider)',
  },
  dialogButton: {
    flex: 1,
    height: 48,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 'var(--body2-size)',
  },
  toast: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000,
    maxWidth: 'calc(100vw - 32px)',
    padding: '10px 16px',
    background: 'var(--gray-850)',
    color: '#fff',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--body2-size)',
    lineHeight: 1.4,
    textAlign: 'center',
    boxShadow: 'var(--shadow-lg)',
    animation: 'aahh-pop .25s ease-out',
    whiteSpace: 'pre-line',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--fill)',
    color: 'var(--text-secondary)',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    borderRadius: 'var(--radius-full)',
    padding: '4px 10px',
    fontSize: 'var(--body4-size)',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    padding: '22px 20px',
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
    flexShrink: 0,
  },
  statValue: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1,
  },
  statLabel: {
    color: 'var(--text-secondary)',
    fontSize: 'var(--body2-size)',
    marginTop: 6,
  },
  statNote: {
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body4-size)',
    marginTop: 4,
  },
  centerState: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--background-secondary)',
  },
  spinner: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '3px solid var(--fill-strong)',
    borderTopColor: 'var(--primary)',
    animation: 'aahh-glowspin .8s linear infinite',
  },
}
