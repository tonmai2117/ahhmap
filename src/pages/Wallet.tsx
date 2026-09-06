import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api'
import { CoinIcon } from '../components/CoinIcon'
import { Icon } from '../components/Icon'
import { LineProfileCard, type LineProfile } from '../components/LineProfileCard'
import { Badge, Button, ConfirmDialog, Empty, Spinner, Tabs, useToast } from '../components/ui'
import { getProfile } from '../liff'
import type { MarketCoupon as Coupon, Redemption } from '../types'
import { userFacingError } from '../utils/errors'
import { formatThaiDateTime } from '../utils/format'

type ActiveQR = {
  redemptionId: string
  qrPayload: string
  expiresAt: string
}

export default function Wallet() {
  const [tab, setTab] = useState<'market' | 'mine'>('market')
  const [balance, setBalance] = useState(0)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [redemptions, setRedeem] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<{ title: string; msg: string; onOk: () => void } | null>(null)
  const [activeQR, setActiveQR] = useState<ActiveQR | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [profile, setProfile] = useState<LineProfile>(null)
  const [loadError, setLoadError] = useState('')
  const { toast, showToast } = useToast()

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, couponRes, walletRes] = await Promise.all([
        api.get<{ coin_balance: number }>('/me'),
        api.get<{ coupons: Coupon[] }>('/coupons'),
        api.get<{ balance: number; redemptions: Redemption[] }>('/wallet'),
      ])
      setBalance(meRes.coin_balance)
      setCoupons(couponRes.coupons)
      setRedeem(walletRes.redemptions)
      setLoadError('')
    } catch (err) {
      setLoadError(userFacingError(err, 'โหลดกระเป๋าไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    getProfile()
      .then(setProfile)
      // Profile display is decorative; keep the wallet usable if LIFF profile lookup fails.
      .catch(() => {})
  }, [])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await fetchAll()
    setRefreshing(false)
  }

  useEffect(() => {
    if (!activeQR?.expiresAt) {
      setTimeLeft(0)
      return
    }
    const exp = new Date(activeQR.expiresAt).getTime()
    const calc = () => Math.max(0, Math.floor((exp - Date.now()) / 1_000))
    setTimeLeft(calc())
    const id = setInterval(() => {
      const s = calc()
      setTimeLeft(s)
      if (s <= 0) clearInterval(id)
    }, 1_000)
    return () => clearInterval(id)
  }, [activeQR])

  const confirmRedeem = (c: Coupon) => {
    setConfirm({
      title: 'แลกรางวัล',
      msg: `แลก "${c.title}"\nใช้ ${c.coin_cost} เหรียญ\n(คงเหลือ ${balance} เหรียญ)`,
      onOk: async () => {
        setConfirm(null)
        setBusy(true)
        try {
          await api.post(`/coupons/${c.id}/redeem`)
          await fetchAll()
          setTab('mine')
        } catch (err) {
          showToast(userFacingError(err))
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const confirmUse = (r: Redemption) => {
    setConfirm({
      title: 'ใช้คูปอง',
      msg: 'เมื่อกด "ยืนยัน" จะมีเวลา 15 นาที\nกรุณากดต่อหน้าพนักงานเท่านั้น',
      onOk: async () => {
        setConfirm(null)
        setBusy(true)
        try {
          const res = await api.post<{ qr_payload: string; expires_at: string }>(`/redemptions/${r.id}/use`)
          setActiveQR({ redemptionId: r.id, qrPayload: res.qr_payload, expiresAt: res.expires_at })
          await fetchAll()
        } catch (err) {
          showToast(userFacingError(err))
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const viewQR = (r: Redemption) => {
    if (!r.expires_at) {
      showToast('คูปองนี้ยังไม่พร้อมแสดง QR กรุณากดใช้งานอีกครั้ง')
      return
    }
    setActiveQR({
      redemptionId: r.id,
      qrPayload: r.coupons.qr_payload,
      expiresAt: r.expires_at,
    })
  }

  const handleConfirmDone = async () => {
    if (!activeQR) return
    setBusy(true)
    try {
      await api.post(`/redemptions/${activeQR.redemptionId}/confirm`)
      setActiveQR(null)
      await fetchAll()
    } catch (err) {
      showToast(userFacingError(err))
    } finally {
      setBusy(false)
    }
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  if (loading) return <Spinner />

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.profileRow}>
          <LineProfileCard
            profile={profile}
            badgeLabel="LINE connected"
            style={S.profileCardStyle}
          />
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="รีเฟรชคูปอง"
            style={S.refreshBtn}
          >
            <span style={{ display: 'flex', animation: refreshing ? 'aahh-glowspin .8s linear infinite' : undefined }}>
              <Icon name="refresh" size={22} />
            </span>
          </button>
        </div>
        <div style={S.balanceRow}>
          <CoinIcon size={34} />
          <span style={S.balance}>{balance}</span>
          <span style={S.balanceLabel}>เหรียญสมบัติ</span>
        </div>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'market', label: 'ร้านค้ารางวัล' },
          { value: 'mine', label: 'กระเป๋าของฉัน' },
        ]}
      />

      <main style={S.content}>
        {loadError && (
          <div style={S.errorBox}>
            <p style={S.errorText}>{loadError}</p>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'กำลังโหลด...' : 'ลองใหม่'}
            </Button>
          </div>
        )}
        {tab === 'market' && (
          <>
            {coupons.length === 0 && <Empty text="ยังไม่มีคูปองที่แลกได้" />}
            {coupons.map((c) => (
              <CouponCard
                key={c.id}
                shopName={c.shops.name}
                title={c.title}
                subtitle={c.description}
                meta={`หมดอายุ ${formatThaiDateTime(c.valid_until)}`}
                right={
                  <div style={S.cardAction}>
                    <p style={S.cost}>฿ {c.coin_cost}</p>
                    <Button size="sm" disabled={busy || balance < c.coin_cost} onClick={() => confirmRedeem(c)}>
                      แลก
                    </Button>
                  </div>
                }
              />
            ))}
          </>
        )}

        {tab === 'mine' && (
          <>
            {redemptions.length === 0 && <Empty text="ยังไม่มีคูปอง" />}
            {redemptions.map((r) => {
              const done = r.status === 'used' || r.status === 'expired'
              return (
                <CouponCard
                  key={r.id}
                  faded={done}
                  shopName={r.coupons.shops.name}
                  title={r.coupons.title}
                  subtitle={r.coupons.description}
                  meta={`${r.used_at ? `ใช้แล้ว ${formatThaiDateTime(r.used_at)}` : `แลกเมื่อ ${formatThaiDateTime(r.redeemed_at)}`}`}
                  right={
                    <div style={S.cardAction}>
                      {r.status === 'redeemed' && (
                        <Button size="sm" onClick={() => confirmUse(r)} disabled={busy}>
                          ใช้งาน
                        </Button>
                      )}
                      {r.status === 'in_use' && (
                        <Button size="sm" variant="outline" onClick={() => viewQR(r)}>
                          ดู QR
                        </Button>
                      )}
                      {r.status === 'used' && <Badge label="ใช้แล้ว" />}
                      {r.status === 'expired' && <Badge label="หมดอายุ" tone="muted" />}
                    </div>
                  }
                />
              )
            })}
          </>
        )}
      </main>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.msg}
          onConfirm={confirm.onOk}
          onCancel={() => setConfirm(null)}
        />
      )}

      {activeQR && (
        <div style={S.qrOverlay}>
          <p style={S.qrTitle}>แสดง QR ต่อหน้าพนักงาน</p>
          <p style={{ ...S.timer, color: timeLeft < 60 ? '#ff6b6b' : '#ffd76a' }}>{fmt(timeLeft)}</p>

          {timeLeft > 0 && activeQR.qrPayload ? (
            <div style={S.qrBox}>
              <QRCodeSVG value={activeQR.qrPayload} size={220} />
            </div>
          ) : (
            <p style={S.expired}>หมดเวลาแล้ว</p>
          )}

          <Button size="lg" fullWidth onClick={handleConfirmDone} disabled={busy} style={{ maxWidth: 280 }}>
            พนักงานยืนยันแล้ว
          </Button>
          <Button
            size="lg"
            fullWidth
            variant="outline"
            onClick={() => setActiveQR(null)}
            style={{ maxWidth: 280, color: '#fff', border: '1.5px solid rgba(255,255,255,.5)' }}
          >
            ปิด
          </Button>
        </div>
      )}

      {toast}
    </div>
  )
}

function CouponCard({
  shopName,
  title,
  subtitle,
  meta,
  right,
  faded,
}: {
  shopName: string
  title: string
  subtitle: string | null
  meta: string
  right: React.ReactNode
  faded?: boolean
}) {
  return (
    <div style={{ ...S.card, opacity: faded ? 0.55 : 1 }}>
      <div style={S.logoSlot}>{shopName.trim().charAt(0) || 'ร'}</div>
      <div style={S.cardBody}>
        <p style={S.shopName}>{shopName}</p>
        <p style={S.couponTitle}>{title}</p>
        {subtitle && <p style={S.desc}>{subtitle}</p>}
        <p style={S.meta}>{meta}</p>
      </div>
      {right}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 430,
    margin: '0 auto',
    minHeight: '100vh',
    background: 'var(--background-secondary)',
    paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
  },
  header: {
    background: 'linear-gradient(160deg, #FC7E51EB, #EF5128EB, #DB431FEB)',
    color: '#fff',
    padding: '22px 20px 18px',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  refreshBtn: {
    flexShrink: 0,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,.4)',
    background: 'rgba(255,255,255,.16)',
    color: '#fff',
    cursor: 'pointer',
    padding: 0,
  },
  profileCardStyle: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 0,
    padding: 0,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: '#fff',
  },
  balanceRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  balance: {
    fontSize: 38,
    fontWeight: 800,
    lineHeight: 0.9,
  },
  balanceLabel: {
    fontSize: 13,
    opacity: 0.85,
    paddingBottom: 2,
  },
  content: {
    display: 'grid',
    gap: 12,
    padding: '12px 16px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
  },
  logoSlot: {
    width: 52,
    height: 52,
    borderRadius: 12,
    background: 'var(--fill-subtle)',
    color: 'var(--primary)',
    fontSize: 22,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  shopName: {
    fontSize: 'var(--body1-size)',
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  couponTitle: {
    marginTop: 2,
    color: 'var(--text-secondary)',
    fontSize: 'var(--body2-size)',
    fontWeight: 700,
  },
  desc: {
    marginTop: 3,
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body3-size)',
    lineHeight: 1.35,
  },
  meta: {
    marginTop: 5,
    color: 'var(--text-tertiary)',
    fontSize: 'var(--body4-size)',
  },
  cardAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  cost: {
    color: 'var(--warning)',
    fontWeight: 800,
    fontSize: 'var(--title4-size)',
  },
  qrOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(0,0,0,.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
  },
  qrTitle: {
    color: '#fff',
    fontSize: 'var(--title3-size)',
    fontWeight: 800,
  },
  timer: {
    fontSize: 38,
    fontWeight: 800,
    lineHeight: 1,
  },
  qrBox: {
    background: '#fff',
    padding: 16,
    borderRadius: 'var(--radius-lg)',
    margin: '8px 0 12px',
  },
  expired: {
    color: '#ff6b6b',
    fontSize: 'var(--title3-size)',
    margin: '30px 0',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    background: '#fff4ef',
    border: '1px solid rgba(239,81,40,.22)',
    borderRadius: 'var(--radius-md)',
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: 'var(--danger)',
    fontSize: 'var(--body3-size)',
    fontWeight: 700,
    lineHeight: 1.45,
  },
}
