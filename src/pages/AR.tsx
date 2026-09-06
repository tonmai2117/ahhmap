import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import * as THREE from 'three'
import { api, ApiError } from '../api'
import { ArButton, Overlay, SuccessScreen } from '../components/ArOverlays'
import { Icon } from '../components/Icon'
import { LineProfileCard, type LineProfile } from '../components/LineProfileCard'
import { Button } from '../components/ui'
import { useArBridge } from '../ar/useArBridge'
import { useGeolocation } from '../hooks/useGeolocation'
import { getProfile } from '../liff'
import { arHintFor, getArContentConfig, getArContentUrl, type ArProgress } from '../ar/arContent'

type OrientationPermissionEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>
}

export default function AR() {
  const navigate             = useNavigate()
  const { treasureId }       = useParams<{ treasureId: string }>()
  const [searchParams]       = useSearchParams()

  // slug ของ 8th Wall content (เช่น 'balloon-pop') — ไม่มี = treasure chest เดิม
  const contentSlug = searchParams.get('content')
  const activeArContent = getArContentConfig(contentSlug)
  const hasUnknownArContent = Boolean(contentSlug && !activeArContent)
  const treasureName = searchParams.get('name')

  const [started, setStarted]     = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [popup, setPopup]         = useState<{ msg: string; ok: boolean; coins?: number } | null>(null)
  const [progress, setProgress]   = useState<ArProgress | null>(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [profile, setProfile] = useState<LineProfile>(null)

  const arHint = arHintFor(activeArContent, progress)

  const videoRef  = useRef<HTMLVideoElement>(null)
  const mountRef  = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const initialLat = parseFloat(searchParams.get('lat') ?? '')
  const initialLng = parseFloat(searchParams.get('lng') ?? '')
  const posRef    = useRef<{ lat: number; lng: number } | null>(
    Number.isFinite(initialLat) && Number.isFinite(initialLng)
      ? { lat: initialLat, lng: initialLng }
      : null,
  )
  // Allow Three.js animation loop to call the latest React callback
  const doCollectRef  = useRef<() => Promise<void>>()
  const collectingRef = useRef(false)
  const popupRef = useRef<typeof popup>(null)

  // LIFF is initialized before the app mounts. A null result intentionally
  // falls back to the shared guest profile presentation.
  useEffect(() => {
    let active = true
    getProfile().then((nextProfile) => {
      if (active) setProfile(nextProfile)
    })
    return () => { active = false }
  }, [])

  // Freshen position once for best accuracy on collect POST; failures fall back to the map-provided coordinates.
  useGeolocation({
    watch: false,
    options: { enableHighAccuracy: true, timeout: 8_000 },
    onPosition: (p) => { posRef.current = { lat: p.lat, lng: p.lng } },
  })

  useEffect(() => {
    setIframeReady(false)
    setProgress(null)
  }, [activeArContent?.slug])

  const doCollect = useCallback(async () => {
    if (collectingRef.current) return
    if (!posRef.current) {
      setPopup({ msg: 'ไม่สามารถระบุตำแหน่งได้ กรุณากลับแผนที่แล้วลองอีกครั้ง', ok: false })
      return
    }
    collectingRef.current = true
    setCollecting(true)
    try {
      const { coins_earned } = await api.post<{ coins_earned: number }>(
        `/treasures/${treasureId}/collect`,
        posRef.current,
      )
      setPopup({ msg: `ยินดีด้วย! ได้รับ ${coins_earned} เหรียญ`, ok: true, coins: coins_earned })
    } catch (err) {
      if      (err instanceof ApiError && err.status === 403) setPopup({ msg: 'อยู่นอกพื้นที่สมบัติ', ok: false })
      else if (err instanceof ApiError && err.status === 409) setPopup({ msg: 'เก็บสมบัตินี้ไปแล้ววันนี้', ok: false })
      else                                                    setPopup({ msg: 'เกิดข้อผิดพลาด กรุณาลองใหม่', ok: false })
    } finally {
      setCollecting(false)
    }
  }, [treasureId])

  // Keep ref in sync so Three.js closure always gets the latest fn
  doCollectRef.current = doCollect
  popupRef.current = popup

  // ── Start handler (needs user gesture for iOS permission) ─────────
  const handleStart = async () => {
    try {
      const orientationEvent = DeviceOrientationEvent as OrientationPermissionEvent
      if (typeof orientationEvent.requestPermission === 'function') {
        await orientationEvent.requestPermission()
      }
    } catch { /* iOS denied orientation — proceed anyway */ }
    setStarted(true)
  }

  // ── postMessage bridge จาก 8th Wall content (iframe same-origin) ──
  useArBridge({
    enabled: Boolean(activeArContent),
    expectedSource: useCallback(() => iframeRef.current?.contentWindow ?? null, []),
    onReady: useCallback(() => setIframeReady(true), []),
    onProgress: useCallback((nextProgress) => setProgress(nextProgress), []),
    onComplete: useCallback(() => { doCollectRef.current?.() }, []),
  })

  // ── Three.js + camera setup (built-in treasure chest เท่านั้น) ────
  useEffect(() => {
    if (activeArContent || hasUnknownArContent) return // 8th Wall content จัดการกล้อง/ฉากเองใน iframe
    if (!started || !mountRef.current || !videoRef.current) return

    const mount = mountRef.current
    const video = videoRef.current
    let animId = 0
    let stream: MediaStream | null = null
    let disposed = false

    // ── Renderer ─────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.z = 3.8

    // ── Lights ───────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(5, 8, 5)
    scene.add(sun)

    // ── Treasure chest ───────────────────────────────────────────────
    const brown     = new THREE.MeshPhongMaterial({ color: 0x8B4513 })
    const darkBrown = new THREE.MeshPhongMaterial({ color: 0x5C2508 })
    const gold      = new THREE.MeshPhongMaterial({ color: 0xFFD700, shininess: 140 })
    const glow      = new THREE.MeshPhongMaterial({ color: 0xFFEE00, emissive: 0xFFCC00, transparent: true, opacity: 0 })

    const chestGroup = new THREE.Group()
    scene.add(chestGroup)

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), brown)
    chestGroup.add(body)

    // Mid band
    const midBand = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 0.82), gold)
    chestGroup.add(midBand)

    // Corner studs
    ;[[-0.55, 0.35, 0.41], [0.55, 0.35, 0.41], [-0.55, -0.35, 0.41], [0.55, -0.35, 0.41]].forEach(([x, y, z]) => {
      const stud = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), gold)
      stud.position.set(x, y, z)
      chestGroup.add(stud)
    })

    // Lid pivot (hinge at top-back of body)
    const lidPivot = new THREE.Group()
    lidPivot.position.y = 0.4    // top edge of body
    chestGroup.add(lidPivot)

    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 0.8), darkBrown)
    lid.position.y = 0.19        // half-lid above pivot
    lidPivot.add(lid)

    const lidBand = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.82), gold)
    lidBand.position.y = 0.07
    lidPivot.add(lidBand)

    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.82), gold)
    lock.position.y = 0.05
    lidPivot.add(lock)

    // Inner glow (revealed when opened)
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), glow)
    inner.position.y = 0
    chestGroup.add(inner)

    // ── Raycaster ────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const ptr       = new THREE.Vector2()
    let chestOpened = false
    let lidProgress = 0

    const onTap = (cx: number, cy: number) => {
      if (chestOpened || popupRef.current) return
      ptr.x =  (cx / window.innerWidth)  * 2 - 1
      ptr.y = -(cy / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(ptr, camera)
      if (raycaster.intersectObjects(chestGroup.children, true).length > 0) {
        chestOpened = true
      }
    }

    const onClick = (e: MouseEvent)  => onTap(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent)  => {
      const t = e.changedTouches[0]
      if (t) onTap(t.clientX, t.clientY)
    }
    renderer.domElement.addEventListener('click',    onClick)
    renderer.domElement.addEventListener('touchend', onTouch)

    // ── Device orientation (subtle AR tilt) ──────────────────────────
    let targetTiltX = 0
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta  !== null) targetTiltX =  (e.beta  - 60) * 0.006
    }
    window.addEventListener('deviceorientation', onOrient)

    // ── Resize ───────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Camera stream ────────────────────────────────────────────────
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      .then((s) => {
        if (disposed) { s.getTracks().forEach(t => t.stop()); return }
        stream = s
        video.srcObject = s
      })
      .catch(console.error)

    // ── Animation loop ───────────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate)

      // Spin while closed
      if (lidProgress < 1) chestGroup.rotation.y += 0.006

      // Lid opening
      if (chestOpened && lidProgress < 1) {
        lidProgress = Math.min(lidProgress + 0.04, 1)
        lidPivot.rotation.x = -Math.PI * lidProgress
        glow.opacity = lidProgress * 0.6
        if (lidProgress >= 1) {
          doCollectRef.current?.()
        }
      }

      // Subtle orientation tilt (smooth damp)
      chestGroup.rotation.x += (targetTiltX - chestGroup.rotation.x) * 0.08

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      stream?.getTracks().forEach(t => t.stop())
      window.removeEventListener('deviceorientation', onOrient)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('click',    onClick)
      renderer.domElement.removeEventListener('touchend', onTouch)
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          ;(Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose())
        }
      })
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [activeArContent, hasUnknownArContent, started])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* ── โหมด 8th Wall content: iframe จัดการกล้อง + ฉากเองทั้งหมด ── */}
      {activeArContent && started && (
        <iframe
          ref={iframeRef}
          src={getArContentUrl(activeArContent)}
          allow="camera; microphone; gyroscope; accelerometer; magnetometer; xr-spatial-tracking; fullscreen"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          title={`AR content: ${activeArContent.slug}`}
        />
      )}

      {/* ── โหมด treasure chest เดิม (Three.js) ── */}
      {!contentSlug && (
        <>
          {/* Camera feed behind Three.js canvas */}
          <video
            ref={videoRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            playsInline muted autoPlay
          />

          {/* Three.js canvas mount */}
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
        </>
      )}

      {hasUnknownArContent && (
        <Overlay dim="rgba(0,0,0,0.86)">
          <p style={{ fontSize: 22, textAlign: 'center', lineHeight: 1.6, marginBottom: 28 }}>
            ไม่พบเกม AR ที่รองรับสำหรับสมบัตินี้
          </p>
          <ArButton onClick={() => navigate('/map', { replace: true })} color="var(--primary)">กลับแผนที่</ArButton>
        </Overlay>
      )}

      {/* Pre-start overlay */}
      {!started && !hasUnknownArContent && (
        <Overlay>
          <p style={{ color: 'white', fontSize: 20, lineHeight: 1.6, textAlign: 'center', marginBottom: 28 }}>
            {activeArContent
              ? <>กดปุ่มด้านล่างเพื่อเปิดกล้อง<br />และเริ่มเกม AR</>
              : <>กดปุ่มด้านล่างเพื่อเปิดกล้อง<br />และเริ่มล่าสมบัติ</>}
          </p>
          <ArButton onClick={handleStart} color="var(--primary)">เริ่มเกม</ArButton>
          <ArButton onClick={() => navigate('/map')} color="transparent" outline>ย้อนกลับ</ArButton>
        </Overlay>
      )}

      {/* Hint text */}
      {started && !popup && !collecting && (
        <div style={{
          position: 'absolute', bottom: 110, left: 0, right: 0,
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <span style={{
            color: 'white', fontSize: 16, fontWeight: 600,
            textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.35)', padding: '8px 20px', borderRadius: 20,
          }}>
            {activeArContent
              ? arHint
              : 'แตะกล่องสมบัติเพื่อเปิด'}
          </span>
        </div>
      )}

      {/* Loading */}
      {collecting && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: '20px 32px', color: 'white', fontSize: 16 }}>
            กำลังบันทึก...
          </div>
        </div>
      )}

      {/* Result popup */}
      {popup && popup.ok && (
        <SuccessScreen
          coins={popup.coins ?? 0}
          treasureName={treasureName}
          onContinue={() => navigate('/map')}
        />
      )}
      {activeArContent && started && !iframeReady && !popup && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 'var(--radius-lg)', padding: '16px 24px', color: 'white', fontSize: 16 }}>
            กำลังโหลดเกม AR...
          </div>
        </div>
      )}

      {popup && !popup.ok && (
        <Overlay dim="rgba(0,0,0,0.82)">
          <div style={{ fontSize: 56, marginBottom: 16 }}>{popup.ok ? '🎉' : '😔'}</div>
          <p style={{ fontSize: 22, textAlign: 'center', lineHeight: 1.6, marginBottom: 36 }}>
            {popup.msg}
          </p>
          <ArButton onClick={() => navigate('/map')} color="var(--primary)">กลับแผนที่</ArButton>
          <ArButton onClick={() => { setPopup(null); collectingRef.current = false }} color="transparent" outline>
            ลองอีกครั้ง
          </ArButton>
        </Overlay>
      )}

      {/* Global parent HUD: applies to iframe content and the built-in AR scene. */}
      <div style={S.arHud}>
        <div style={S.profileSlot}>
          <LineProfileCard
            profile={profile}
            variant="compact"
            showBadge={false}
            style={S.profileCardStyle}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          aria-label="กลับแผนที่"
          onClick={() => navigate('/map', { replace: true })}
          style={S.mapButton}
        >
          <Icon name="back" size={20} />
          กลับแผนที่
        </Button>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  arHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    padding: 'calc(12px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 0 calc(12px + env(safe-area-inset-left))',
    boxSizing: 'border-box',
    pointerEvents: 'none',
  },
  profileSlot: {
    flex: '1 1 auto',
    minWidth: 0,
    maxWidth: 120,
  },
  profileCardStyle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
    background: 'var(--surface)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-md)',
    width: 'auto',
    boxSizing: 'border-box',
    padding: '0px 16px 0px 0px',
  },
  mapButton: {
    minHeight: 40,
    padding: '8px 12px',
    flexShrink: 0,
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
    background: 'var(--surface)',
    border: '1px solid var(--divider)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    color: 'var(--text-primary)',
  },
}
