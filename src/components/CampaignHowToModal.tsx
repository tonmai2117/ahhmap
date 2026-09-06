import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CampaignHowToModal({
  open,
  title,
  content,
  onClose,
  returnFocusRef,
}: {
  open: boolean
  title: string
  content: string
  onClose: () => void
  returnFocusRef: React.RefObject<HTMLButtonElement>
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const returnFocusElement = returnFocusRef.current
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      ;(returnFocusElement ?? previousFocus)?.focus()
    }
  }, [open, onClose, returnFocusRef])

  if (!open) return null

  return createPortal(
    <div
      style={S.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-how-to-title"
        tabIndex={-1}
        style={S.dialog}
      >
        <button ref={closeRef} type="button" onClick={onClose} style={S.close} aria-label="ปิดวิธีเล่น">
          <Icon name="close" size={22} />
        </button>
        <h2 id="campaign-how-to-title" style={S.title}>{title}</h2>
        <p style={S.content}>{content}</p>
      </div>
    </div>,
    document.body,
  )
}

const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--dim)',
  },
  dialog: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: '28px 24px 26px',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--surface)',
    boxShadow: 'var(--shadow-xl)',
    outline: 'none',
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    borderRadius: 'var(--radius-full)',
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  title: {
    margin: '0 44px 16px 0',
    fontFamily: 'var(--font-brand)',
    fontSize: 22,
    lineHeight: 1.25,
  },
  content: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: 'var(--body1-size)',
    lineHeight: 1.65,
    whiteSpace: 'pre-line',
  },
}
