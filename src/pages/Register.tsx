import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import L from 'leaflet'
import { api } from '../api'
import { Icon } from '../components/Icon'
import { FormField } from '../components/FormField'
import { LineProfileCard, type LineProfile } from '../components/LineProfileCard'
import { Button } from '../components/ui'
import { getProfile } from '../liff'
import { userFacingError } from '../utils/errors'
import { CARTO_TILE_OPTIONS, CARTO_VOYAGER_TILE_URL, REGISTER_MAP_CENTER } from '../utils/mapDefaults'
import { safeNext } from './registerNext'

const AGE_RANGES = ['ต่ำกว่า 18', '18–24', '25–34', '35–44', '45–54', '55 ขึ้นไป']
const GENDERS = ['ชาย', 'หญิง', 'ไม่ระบุ']
const OCCUPATIONS = ['นักเรียน/นักศึกษา', 'พนักงานบริษัท', 'ธุรกิจส่วนตัว', 'ราชการ/รัฐวิสาหกิจ', 'อื่นๆ']

const PLAYER_TYPES = [
  { key: 'achiever', label: 'นักสะสม', desc: 'เก็บแต้ม ปลดล็อกรางวัล ทำภารกิจให้ครบ', icon: 'trophy' },
  { key: 'explorer', label: 'นักสำรวจ', desc: 'ค้นหาสถานที่ใหม่ จุดลับ และรางวัลพิเศษ', icon: 'search' },
  { key: 'socializer', label: 'สายโซเชียล', desc: 'เล่นกับเพื่อน แชร์ และชวนคนอื่น', icon: 'chat' },
  { key: 'competitor', label: 'สายแข่งขัน', desc: 'แข่งขัน ไต่อันดับ พาทีมคว้าชัย', icon: 'star' },
] as const

type PlayerType = (typeof PLAYER_TYPES)[number]['key']

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [role, setRole] = useState<'player' | 'holder'>('player')
  const [displayName, setDisplayName] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [playerType, setPlayerType] = useState<PlayerType>('achiever')
  const [consent, setConsent] = useState(false)
  const [shopName, setShopName] = useState('')
  const [shopDesc, setShopDesc] = useState('')
  const [shopPos, setShopPos] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<LineProfile>(null)

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p)
      if (p?.displayName) setDisplayName((current) => current || p.displayName)
    })
  }, [])

  useEffect(() => {
    if (role !== 'holder' || !mapDivRef.current) return

    const map = L.map(mapDivRef.current, { zoomControl: false }).setView(REGISTER_MAP_CENTER, 13)
    L.tileLayer(CARTO_VOYAGER_TILE_URL, CARTO_TILE_OPTIONS).addTo(map)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      setShopPos({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) {
      setError('กรุณายินยอม PDPA')
      return
    }
    if (role === 'holder' && !shopPos) {
      setError('กรุณาคลิกบนแผนที่เพื่อปักหมุดตำแหน่งร้าน')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post('/register', {
        role,
        display_name: displayName,
        demographics: {
          age_range: ageRange,
          gender,
          occupation,
          consent_pdpa: true,
          ...(role === 'player' ? { player_type: playerType } : {}),
        },
        ...(role === 'holder'
          ? { shop: { name: shopName, lat: shopPos!.lat, lng: shopPos!.lng, description: shopDesc } }
          : {}),
      })
      navigate(safeNext(searchParams.get('next')) ?? (role === 'holder' ? '/holder' : '/map'))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message === 'rich_menu_link_failed'
          ? 'ลงทะเบียนแล้ว แต่เปลี่ยนเมนู LINE ไม่สำเร็จ กรุณากดอีกครั้ง'
          : userFacingError(err),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.headerTitle}>ลงทะเบียนผู้เล่น</h1>
        <p style={S.headerText}>สำรวจ เก็บเหรียญ และแลกรางวัลจริงจากสถานที่รอบตัวคุณ</p>
      </header>

      <form onSubmit={handleSubmit} style={S.form}>
        <LineProfileCard
          profile={profile ?? (displayName ? { displayName } : null)}
        />

        <div style={S.field}>
          <label style={S.label}>บทบาทของคุณ</label>
          <div style={S.roleGrid}>
            <RoleCard
              active={role === 'player'}
              icon="user"
              title="ผู้เล่น"
              text="เก็บเหรียญ แลกรางวัล"
              onClick={() => setRole('player')}
            />
            <RoleCard
              active={role === 'holder'}
              icon="shop"
              title="ร้านค้า"
              text="วางจุดสมบัติที่ร้านคุณ"
              onClick={() => setRole('holder')}
            />
          </div>
        </div>

        <FormField label="ชื่อที่แสดง" required>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="ชื่อ-นามสกุล หรือชื่อเล่น"
            style={S.input}
          />
        </FormField>

        {role === 'player' && (
          <div style={S.field}>
            <label style={S.label}>คุณเป็นผู้เล่นแบบไหน?</label>
            <div style={S.playerGrid}>
              {PLAYER_TYPES.map((type) => {
                const selected = playerType === type.key
                return (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setPlayerType(type.key)}
                    style={{
                      ...S.playerTypeCard,
                      ...(selected ? S.playerTypeCardSelected : {}),
                    }}
                  >
                    <span style={{ ...S.playerTypeIcon, ...(selected ? S.playerTypeIconSelected : {}) }}>
                      <Icon name={type.icon} size={20} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={S.playerTypeLabel}>{type.label}</span>
                      <span style={S.playerTypeDesc}>{type.desc}</span>
                    </span>
                    {selected && <Icon name="check" size={18} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={S.twoCols}>
          <FormField label="ช่วงอายุ">
            <select value={ageRange} onChange={(e) => setAgeRange(e.target.value)} style={S.input}>
              <option value="">เลือก...</option>
              {AGE_RANGES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </FormField>

          <FormField label="เพศ">
            <select value={gender} onChange={(e) => setGender(e.target.value)} style={S.input}>
              <option value="">เลือก...</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="อาชีพ">
          <select value={occupation} onChange={(e) => setOccupation(e.target.value)} style={S.input}>
            <option value="">เลือก...</option>
            {OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </FormField>

        {role === 'holder' && (
          <>
            <FormField label="ชื่อร้าน" required>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                placeholder="ชื่อร้านของคุณ"
                style={S.input}
              />
            </FormField>

            <FormField label="รายละเอียดร้าน">
              <textarea
                value={shopDesc}
                onChange={(e) => setShopDesc(e.target.value)}
                rows={3}
                placeholder="แนะนำร้านสั้นๆ (ไม่บังคับ)"
                style={{ ...S.input, minHeight: 92, resize: 'vertical' }}
              />
            </FormField>

            <div style={S.field}>
              <label style={S.label}>
                ตำแหน่งร้าน <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <p style={S.hint}>คลิกบนแผนที่เพื่อปักหมุด</p>
              <div ref={mapDivRef} style={S.mapContainer} />
              {shopPos && (
                <p style={S.hint}>
                  {shopPos.lat.toFixed(5)}, {shopPos.lng.toFixed(5)}
                </p>
              )}
            </div>
          </>
        )}

        <div style={S.consentBox}>
          <label style={S.consentLabel}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={S.checkbox}
            />
            <span>ยินยอมให้เก็บข้อมูลเพื่อพัฒนาบริการและนำเสนอเชิงสถิติแบบไม่ระบุตัวตน</span>
          </label>
        </div>

        {error && <p style={S.error}>{error}</p>}

        <Button type="submit" size="lg" fullWidth disabled={loading || !consent}>
          {loading ? 'กำลังบันทึก...' : 'เริ่มการผจญภัย'}
        </Button>
      </form>
    </div>
  )
}

function RoleCard({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean
  icon: 'user' | 'shop'
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...S.roleCard,
        ...(active ? S.roleCardActive : {}),
      }}
    >
      <Icon name={icon} size={24} />
      <span style={{ fontWeight: 800 }}>{title}</span>
      <span style={{ fontSize: 'var(--body4-size)', opacity: active ? 0.92 : 0.78 }}>{text}</span>
    </button>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 430,
    margin: '0 auto',
    minHeight: '100vh',
    background: 'var(--background-secondary)',
  },
  header: {
    background: 'linear-gradient(150deg, #ff8a5c 0%, #ef5128 55%, #d63f1c 100%)',
    padding: '22px 20px 26px',
    color: '#fff',
  },
  headerTitle: {
    fontFamily: 'var(--font-brand)',
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  headerText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.45,
    color: 'rgba(255,255,255,.92)',
  },
  form: {
    padding: '16px 16px calc(28px + env(safe-area-inset-bottom))',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontWeight: 700,
    marginBottom: 6,
    fontSize: 'var(--body2-size)',
    color: 'var(--text-primary)',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  roleCard: {
    minHeight: 98,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    textAlign: 'left',
  },
  roleCardActive: {
    border: '1.5px solid var(--primary)',
    background: 'var(--primary)',
    color: 'var(--on-primary)',
  },
  input: {
    width: '100%',
    height: 48,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: 'var(--body2-size)',
    color: 'var(--text-primary)',
    background: 'var(--surface)',
    outlineColor: 'var(--primary)',
  },
  twoCols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  playerGrid: {
    display: 'grid',
    gap: 10,
  },
  playerTypeCard: {
    minHeight: 70,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    textAlign: 'left',
  },
  playerTypeCardSelected: {
    border: '1.5px solid var(--primary)',
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
  },
  playerTypeIcon: {
    width: 38,
    height: 38,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
    flexShrink: 0,
  },
  playerTypeIconSelected: {
    background: 'var(--primary)',
    color: '#fff',
  },
  playerTypeLabel: {
    display: 'block',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontSize: 'var(--body2-size)',
  },
  playerTypeDesc: {
    display: 'block',
    marginTop: 2,
    fontSize: 'var(--body4-size)',
    lineHeight: 1.35,
    color: 'var(--text-tertiary)',
  },
  mapContainer: {
    height: 240,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    marginTop: 6,
    overflow: 'hidden',
  },
  hint: {
    fontSize: 'var(--body4-size)',
    color: 'var(--text-tertiary)',
    marginTop: 4,
  },
  consentBox: {
    marginBottom: 20,
    padding: '14px 16px',
    background: 'var(--surface-sunken)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--divider)',
  },
  consentLabel: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    cursor: 'pointer',
    fontSize: 'var(--body2-size)',
    lineHeight: 1.6,
    color: 'var(--text-secondary)',
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 2,
    flexShrink: 0,
    accentColor: 'var(--primary)',
  },
  error: {
    color: 'var(--danger)',
    marginBottom: 12,
    fontSize: 'var(--body2-size)',
  },
}
