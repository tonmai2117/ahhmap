import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { SHOP_MARKER_COLORS } from '../pages/shopMapPresentation'
import { TIER_COLORS } from '../map/mapDomain'

// The Shop map contract has no per-portal rarity data (the DB column backing it is
// named `rarity`, not `tier`, and isn't wired up here) — every portal renders as 'rare'.
const PORTAL_TIER = 'rare' as const

export type ShopMapSheetPortal = {
  id: string
  name: string
  sequence: number
  coin_reward: number
}

export function ShopMapSheet({
  state,
  onStateChange,
  onHeightChange,
  campaignTitle,
  portals,
  shopCount,
  onPanTo,
}: {
  state: 'expanded' | 'collapsed'
  onStateChange: (state: 'expanded' | 'collapsed') => void
  onHeightChange: (height: number) => void
  campaignTitle: string | null
  portals: ShopMapSheetPortal[]
  shopCount: number
  onPanTo: (portal: ShopMapSheetPortal) => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startY: number; offset: number; collapsedOffset: number } | null>(null)
  const [dragOffset, setDragOffset] = useState<number | null>(null)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    const measure = () => onHeightChange(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeightChange, portals.length, state])

  const fullHeight = sheetRef.current?.offsetHeight ?? 260
  const collapsedOffset = Math.max(0, fullHeight - 64)
  const translateY = dragOffset ?? (state === 'collapsed' ? collapsedOffset : 0)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      startY: e.clientY,
      offset: state === 'collapsed' ? collapsedOffset : 0,
      collapsedOffset,
    }
    setDragOffset(state === 'collapsed' ? collapsedOffset : 0)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const next = Math.max(0, Math.min(dragRef.current.collapsedOffset, dragRef.current.offset + e.clientY - dragRef.current.startY))
    setDragOffset(next)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    const delta = e.clientY - drag.startY
    setDragOffset(null)
    if (delta > 40) onStateChange('collapsed')
    else if (delta < -40) onStateChange('expanded')
    else onStateChange(state)
  }

  return (
    <div
      ref={sheetRef}
      style={{
        ...S.sheet,
        transform: `translateY(${translateY}px)`,
        transition: dragRef.current ? 'none' : 'transform .3s var(--ease-standard)',
      }}
    >
      <div
        style={S.sheetHeader}
        onClick={() => onStateChange(state === 'expanded' ? 'collapsed' : 'expanded')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div style={S.handle} />
        <div style={S.sheetTitleRow}>
          <div>
            <p style={S.sheetTitle}>{campaignTitle ?? 'จุดร้านค้าใน Host'}</p>
            <p style={S.sheetSub}>{portals.length} จุด • ร้านใน Host {shopCount} ร้าน</p>
            {!campaignTitle && <p style={S.sheetNote}>ยังไม่มีกิจกรรมที่กำลังเปิด แสดงตำแหน่งร้านใน Host เท่านั้น</p>}
          </div>
          <Icon name={state === 'expanded' ? 'close' : 'list'} size={18} />
        </div>
        <div style={S.legend}>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: SHOP_MARKER_COLORS.own }} />ร้านของฉัน</span>
          <span style={S.legendItem}><span style={{ ...S.legendDot, background: SHOP_MARKER_COLORS.peer }} />ร้านใน Host</span>
        </div>
      </div>

      <div style={S.portalList}>
        {portals.map((portal) => {
          const color = TIER_COLORS[PORTAL_TIER]
          return (
            <button key={portal.id} type="button" onClick={() => onPanTo(portal)} style={S.portalRow}>
              <span style={{ ...S.portalIcon, background: `${color}1a`, color }}>
                <Icon name="star" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={S.portalName}>{portal.name}</span>
                <span style={S.portalMeta}>จุดที่ {portal.sequence} • {portal.coin_reward} เหรียญ</span>
              </span>
              <span style={{ ...S.portalBadge, color, background: `${color}1f`, borderColor: `${color}55` }}>
                จุดที่ {portal.sequence}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 800,
    background: 'var(--surface)',
    borderRadius: '22px 22px 0 0',
    boxShadow: '0 -8px 30px rgba(0,0,0,.25)',
    padding: '10px 16px calc(18px + env(safe-area-inset-bottom))',
    animation: 'aahh-sheet-up .3s var(--ease-standard)',
  },
  sheetHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    touchAction: 'none',
    cursor: 'grab',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 'var(--radius-full)',
    background: 'var(--fill-strong)',
  },
  sheetTitleRow: {
    minHeight: 42,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'var(--text-secondary)',
  },
  sheetTitle: {
    fontSize: 'var(--title3-size)',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  sheetSub: {
    marginTop: 3,
    fontSize: 'var(--body4-size)',
    color: 'var(--text-tertiary)',
  },
  sheetNote: {
    marginTop: 4,
    fontSize: 'var(--body4-size)',
    color: 'var(--text-tertiary)',
  },
  legend: {
    display: 'flex',
    gap: 14,
    fontSize: 'var(--body4-size)',
    color: 'var(--text-secondary)',
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
  },
  portalList: {
    display: 'grid',
    gap: 6,
    maxHeight: '42vh',
    overflowY: 'auto',
    padding: '6px 0 12px',
  },
  portalRow: {
    minHeight: 58,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    border: 'none',
    background: 'transparent',
    padding: '8px 0',
    textAlign: 'left',
  },
  portalIcon: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  portalName: {
    display: 'block',
    color: 'var(--text-primary)',
    fontSize: 'var(--body2-size)',
    fontWeight: 800,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  portalMeta: {
    display: 'block',
    marginTop: 2,
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body4-size)',
  },
  portalBadge: {
    border: '1px solid',
    borderRadius: 'var(--radius-full)',
    fontSize: 11,
    fontWeight: 800,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
  },
}
