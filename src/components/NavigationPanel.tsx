import { Button } from './ui'
import { formatDistance, formatDuration, type Destination, type FetchStatus, type NavigationPhase, type RouteResult, type SimulationStatus, type TravelMode } from '../map/navigationDomain'

type Props = {
  open: boolean
  phase: NavigationPhase
  status: FetchStatus
  destination: Destination | null
  route: RouteResult | null
  error: string
  travelMode: TravelMode
  isDemo: boolean
  useRealGps: boolean
  simulationStatus: SimulationStatus
  remainingM: number | null
  currentStepIndex: number
  onOpen: () => void
  onPickOnMap: () => void
  onSelectDemo: () => void
  onCalculate: () => void
  onStart: () => void
  onCancel: () => void
  onTravelModeChange: (mode: TravelMode) => void
  onSimulationStart: () => void
  onSimulationPause: () => void
  onSimulationReset: () => void
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} style={{ ...S.segment, ...(active ? S.segmentActive : {}) }}>
      {children}
    </button>
  )
}

export function NavigationPanel(props: Props) {
  if (!props.open) {
    return (
      <Button size="lg" fullWidth onClick={props.onOpen}>
        นำทางไป…
      </Button>
    )
  }

  const activeStep = props.route?.steps[props.currentStepIndex]
  const showRoute = props.route && props.status === 'ready'

  return (
    <section aria-label="การนำทาง" style={S.panel}>
      <div style={S.panelHeader}>
        <div>
          <p style={S.title}>{props.phase === 'arrived' ? 'ถึงปลายทางแล้ว' : 'นำทางไปที่ไหน'}</p>
          <p style={S.sub}>{props.useRealGps ? 'ตำแหน่ง GPS ของอุปกรณ์' : 'GPS จำลอง กรุงเทพฯ'}</p>
        </div>
        <button type="button" onClick={props.onCancel} aria-label="ปิดการนำทาง" style={S.close}>×</button>
      </div>

      <div style={S.segments} aria-label="รูปแบบการเดินทาง">
        <SegmentButton active={props.travelMode === 'walking'} onClick={() => props.onTravelModeChange('walking')}>เดิน</SegmentButton>
        <SegmentButton active={props.travelMode === 'driving'} onClick={() => props.onTravelModeChange('driving')}>รถ</SegmentButton>
      </div>

      {!props.destination && (
        <div style={S.actions}>
          <Button variant="outline" size="lg" fullWidth onClick={props.onPickOnMap}>
            {props.phase === 'selecting' ? 'แตะตำแหน่งบนแผนที่' : 'เลือกบนแผนที่'}
          </Button>
          {props.isDemo && (
            <Button variant="outline" size="lg" fullWidth onClick={props.onSelectDemo}>
              จุดทดสอบ A (กรุงเทพฯ)
            </Button>
          )}
        </div>
      )}

      {props.destination && (
        <div style={S.destination}>
          <span style={S.pin}>●</span>
          <span style={{ minWidth: 0 }}>
            <strong style={S.destinationName}>{props.destination.name}</strong>
            <span style={S.coords}>{props.destination.lat.toFixed(5)}, {props.destination.lng.toFixed(5)}</span>
          </span>
        </div>
      )}

      {props.status === 'loading' && <p style={S.state}>กำลังคำนวณเส้นทาง…</p>}
      {props.status === 'error' && (
        <div style={S.errorBox}>
          <p>{props.error}</p>
          <Button variant="outline" onClick={props.onCalculate}>ลองใหม่</Button>
        </div>
      )}

      {props.destination && props.status === 'idle' && (
        <Button size="lg" fullWidth onClick={props.onCalculate}>ดูเส้นทาง</Button>
      )}

      {showRoute && (
        <>
          <div style={S.summary}>
            <strong>{formatDuration(props.route!.durationS)}</strong>
            <span>{formatDistance(props.remainingM ?? props.route!.distanceM)}</span>
            <span>{props.travelMode === 'walking' ? 'เดินเท้า' : 'รถ/ถนน'}</span>
          </div>
          {props.route!.snappedDestinationDistanceM > 30 && (
            <p style={S.notice}>ปลายเส้นทางอยู่ห่างจากจุดที่เลือก {formatDistance(props.route!.snappedDestinationDistanceM)}</p>
          )}

          {props.phase === 'preview' && <Button size="lg" fullWidth onClick={props.onStart}>เริ่มนำทาง</Button>}

          {(props.phase === 'navigating' || props.phase === 'arrived') && (
            <div style={S.currentStep}>
              <span style={S.eyebrow}>{props.phase === 'arrived' ? 'เสร็จแล้ว' : 'ขั้นตอนถัดไป'}</span>
              <strong>{props.phase === 'arrived' ? 'ถึงปลายทางแล้ว' : (activeStep?.instruction ?? 'เดินทางต่อ')}</strong>
              {props.phase !== 'arrived' && activeStep && <span>{formatDistance(activeStep.distanceM)}</span>}
            </div>
          )}

          <ol style={S.stepList}>
            {props.route!.steps.map((step, index) => (
              <li key={step.id} style={{ ...S.step, ...(index === props.currentStepIndex ? S.stepActive : {}) }}>
                <span style={S.stepNumber}>{index + 1}</span>
                <span style={{ flex: 1 }}>{step.instruction}</span>
                <small>{formatDistance(step.distanceM)}</small>
              </li>
            ))}
          </ol>

          {props.isDemo && (
            <div style={S.simulation}>
              <p style={S.simTitle}>จำลองการเดินทางประมาณ 30 วินาที</p>
              {props.useRealGps ? (
                <p style={S.notice}>ใช้ GPS จริงอยู่ จึงปิดการจำลอง</p>
              ) : (
                <div style={S.simButtons}>
                  {props.simulationStatus === 'running' ? (
                    <Button variant="outline" onClick={props.onSimulationPause}>พัก</Button>
                  ) : (
                    <Button variant="outline" onClick={props.onSimulationStart}>เริ่มจำลอง</Button>
                  )}
                  <Button variant="ghost" onClick={props.onSimulationReset}>รีเซ็ต</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

const S: Record<string, React.CSSProperties> = {
  panel: { display: 'grid', gap: 10, maxHeight: '58vh', overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: 2 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { color: 'var(--text-primary)', fontSize: 'var(--title3-size)', fontWeight: 800 },
  sub: { marginTop: 2, color: 'var(--text-tertiary)', fontSize: 'var(--body4-size)' },
  close: { width: 36, height: 36, border: 0, borderRadius: '50%', background: 'var(--fill-subtle)', color: 'var(--text-secondary)', fontSize: 24, lineHeight: 1 },
  segments: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, borderRadius: 'var(--radius-md)', background: 'var(--fill-subtle)' },
  segment: { minHeight: 40, borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 'var(--body2-size)', fontWeight: 700 },
  segmentActive: { borderColor: 'var(--divider)', background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' },
  actions: { display: 'grid', gap: 8 },
  destination: { display: 'flex', gap: 10, alignItems: 'center', padding: 10, border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', background: 'var(--fill-subtle)' },
  pin: { color: 'var(--primary)', fontSize: 20 },
  destinationName: { display: 'block', overflow: 'hidden', color: 'var(--text-primary)', fontSize: 'var(--body2-size)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  coords: { display: 'block', marginTop: 2, color: 'var(--text-tertiary)', fontSize: 'var(--body4-size)' },
  state: { padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--body2-size)' },
  errorBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 10, borderRadius: 'var(--radius-md)', background: 'rgba(255,51,75,.1)', color: 'var(--danger)', fontSize: 'var(--body3-size)' },
  summary: { display: 'flex', alignItems: 'baseline', gap: 10, color: 'var(--text-secondary)', fontSize: 'var(--body3-size)' },
  notice: { color: 'var(--text-tertiary)', fontSize: 'var(--body4-size)', lineHeight: 1.45 },
  currentStep: { display: 'grid', gap: 3, padding: 12, borderRadius: 'var(--radius-md)', background: 'rgba(239,81,40,.10)', color: 'var(--text-primary)', fontSize: 'var(--body2-size)' },
  eyebrow: { color: 'var(--primary)', fontSize: 'var(--body4-size)', fontWeight: 800 },
  stepList: { display: 'grid', gap: 4, maxHeight: 150, overflowY: 'auto', listStyle: 'none' },
  step: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 'var(--body3-size)' },
  stepActive: { background: 'var(--fill-subtle)', color: 'var(--text-primary)' },
  stepNumber: { width: 22, height: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--fill)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 800 },
  simulation: { display: 'grid', gap: 7, paddingTop: 2 },
  simTitle: { color: 'var(--text-secondary)', fontSize: 'var(--body4-size)', fontWeight: 700 },
  simButtons: { display: 'flex', gap: 8 },
}
