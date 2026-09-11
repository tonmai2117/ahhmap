import { useEffect, useRef, useState } from 'react'
import { Button } from './ui'
import { Icon } from './Icon'
import type { Treasure } from '../types'
import type { DemoLaunch } from '../externalGame'
import {
  EVENT_COLORS,
  TIER_COLORS,
  TIER_LABELS,
  getTier,
  haversine,
  type MapMode,
  type MapPosition,
} from '../map/mapDomain'

export function MapBottomSheet({
  state,
  onStateChange,
  onHeightChange,
  mode,
  treasures,
  nearbyCount,
  pos,
  nearbyTreasure,
  inRangeTreasures,
  selectedPortalId,
  onSelectPortal,
  onPanTo,
  onGoToAR,
  demoLaunch,
  onOpenDemo,
  portalBusy,
  toolbar,
  weatherContent,
  navigationContent,
  navigationOpen,
  onNavigateTo,
}: {
  state: 'expanded' | 'collapsed'
  onStateChange: (state: 'expanded' | 'collapsed') => void
  onHeightChange: (height: number) => void
  mode: MapMode
  treasures: Treasure[]
  nearbyCount: number
  pos: MapPosition | null
  nearbyTreasure: Treasure | null
  inRangeTreasures: Treasure[]
  selectedPortalId: string | null
  onSelectPortal: (treasure: Treasure) => void
  onPanTo: (treasure: Treasure) => void
  onGoToAR: () => void
  demoLaunch: DemoLaunch | null
  onOpenDemo: (url: string) => void
  portalBusy: boolean
  toolbar?: React.ReactNode
  weatherContent?: React.ReactNode
  navigationContent?: React.ReactNode
  navigationOpen?: boolean
  onNavigateTo?: (treasure: Treasure) => void
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
  }, [onHeightChange, treasures.length, state])

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
            <p style={S.sheetTitle}>{mode === 'daily' ? 'Portal ใกล้คุณ' : 'Portal Route'}</p>
            <p style={S.sheetSub}>
              {mode === 'daily' ? `${nearbyCount} จุดในรัศมี 500 ม.` : 'เดินตามเส้นทางตามลำดับ'}
            </p>
          </div>
          <Icon name={state === 'expanded' ? 'close' : 'list'} size={18} />
        </div>
      </div>

      {toolbar}
      {weatherContent}

      {navigationOpen ? navigationContent : <div style={S.portalList}>
        {treasures.slice(0, 5).map((t, index) => {
          const tier = getTier(t)
          const color = mode === 'event' ? EVENT_COLORS[index % EVENT_COLORS.length] : TIER_COLORS[tier]
          const distance = pos ? Math.round(haversine(pos.lat, pos.lng, t.lat, t.lng)) : null
          const isSelectable = inRangeTreasures.some((r) => r.id === t.id)
          const isSelected = isSelectable && t.id === selectedPortalId
          return (
            <div key={t.id} style={{ ...S.portalRow, ...(isSelected ? S.portalRowSelected : {}) }}>
              <button
                type="button"
                onClick={() => {
                  onPanTo(t)
                  if (isSelectable) onSelectPortal(t)
                }}
                style={S.portalMain}
              >
              <span style={{ ...S.portalIcon, background: `${color}1a`, color }}>
                <Icon name="star" size={20} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={S.portalName}>{t.name}</span>
                <span style={S.portalMeta}>
                  {distance === null ? '—' : `${distance} ม.`} • {t.coin_reward} เหรียญ
                  {isSelectable && !isSelected ? ' • แตะเพื่อเลือก' : ''}
                </span>
              </span>
              <span
                style={{
                  ...S.portalBadge,
                  color,
                  background: `${color}1f`,
                  borderColor: `${color}55`,
                }}
              >
                {mode === 'event' ? `จุดที่ ${index + 1}` : TIER_LABELS[tier]}
              </span>
              </button>
              {onNavigateTo && <button type="button" style={S.navigateButton} onClick={() => onNavigateTo(t)}>นำทาง</button>}
            </div>
          )
        })}
      </div>}

      {!navigationOpen && navigationContent}

      {!navigationOpen && (demoLaunch ? (
        <>
          <p style={S.demoStatus}>
            {demoLaunch.claim === 'earned' ? 'บันทึกรางวัลแล้ว' : 'เก็บ portal นี้แล้ววันนี้'}
          </p>
          <Button size="lg" fullWidth disabled={portalBusy} onClick={() => onOpenDemo(demoLaunch.url)}>
            {demoLaunch.claim === 'earned' ? 'เปิดเกมอีกครั้ง' : 'เล่นต่อโดยไม่รับเหรียญ'}
          </Button>
        </>
      ) : (
        <Button size="lg" fullWidth disabled={!nearbyTreasure || portalBusy} onClick={onGoToAR}>
          {nearbyTreasure ? (
            <>
              <Icon name="camera" size={18} />
              {portalBusy ? 'กำลังบันทึกรางวัล...' : `เข้า Portal — ${nearbyTreasure.name} • ${nearbyTreasure.coin_reward} เหรียญ`}
            </>
          ) : (
            'เข้าใกล้ Portal เพื่อเริ่มเกม'
          )}
        </Button>
      ))}
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
    border: '2px solid transparent',
    borderRadius: 'var(--radius-md)',
    background: 'transparent',
    padding: '4px',
    textAlign: 'left',
  },
  portalMain: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: 0,
    background: 'transparent',
    padding: 4,
    textAlign: 'left',
  },
  navigateButton: {
    minHeight: 40,
    flexShrink: 0,
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
    padding: '0 10px',
    fontSize: 'var(--body4-size)',
    fontWeight: 800,
  },
  portalRowSelected: {
    border: '2px solid var(--primary)',
    background: 'rgba(239,81,40,.08)',
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
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 'var(--radius-full)',
    fontSize: 11,
    fontWeight: 800,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
  },
  demoStatus: {
    margin: '2px 0 8px',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'center',
  },
}
