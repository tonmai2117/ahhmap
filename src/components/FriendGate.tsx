type FriendGateProps = {
  checking?: boolean
  error?: string
  onAddFriend: () => void
  onRetry: () => void
}

export function FriendGate({
  checking = false,
  error,
  onAddFriend,
  onRetry,
}: FriendGateProps) {
  return (
    <div style={S.page}>
      <div style={S.card}>
        <img
          src="/brand/aahhmap-logo.png"
          alt="AahhMap"
          style={S.logo}
        />
        <h1 style={S.title}>เพิ่มเพื่อน LINE Official Account</h1>
        <p style={S.description}>
          กรุณาเพิ่ม LINE Official Account เป็นเพื่อนก่อนใช้งาน
          เพื่อรับเมนูผู้เล่น ข่าวสาร และรางวัลจากกิจกรรม
        </p>
        {error && <p style={S.error}>{error}</p>}
        <button
          type="button"
          onClick={onAddFriend}
          disabled={checking}
          style={{ ...S.primaryButton, ...(checking ? S.disabled : {}) }}
        >
          {checking ? 'กำลังตรวจสอบ...' : 'เพิ่มเพื่อน LINE OA'}
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={checking}
          style={{ ...S.secondaryButton, ...(checking ? S.disabled : {}) }}
        >
          เพิ่มแล้ว ตรวจสอบอีกครั้ง
        </button>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'linear-gradient(160deg, #ff8a5c 0%, #ef5128 58%, #c9381a 100%)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: '28px 22px 24px',
    borderRadius: 24,
    background: '#fff',
    color: 'var(--text-primary)',
    textAlign: 'center',
    boxShadow: '0 18px 50px rgba(89, 24, 7, .26)',
  },
  logo: {
    width: 96,
    height: 96,
    objectFit: 'contain',
  },
  title: {
    marginTop: 14,
    fontFamily: 'var(--font-brand)',
    fontSize: 24,
    fontWeight: 800,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 1.65,
    color: 'var(--text-secondary)',
  },
  error: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: '#fff1ee',
    color: 'var(--danger)',
    fontSize: 13,
    lineHeight: 1.5,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    marginTop: 20,
    border: 'none',
    borderRadius: 12,
    background: '#06c755',
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
  },
  secondaryButton: {
    width: '100%',
    height: 44,
    marginTop: 10,
    border: '1px solid var(--border)',
    borderRadius: 12,
    background: '#fff',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 700,
  },
  disabled: {
    cursor: 'wait',
    opacity: 0.65,
  },
}
