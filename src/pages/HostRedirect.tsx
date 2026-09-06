import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentHost } from '../api/campaigns'
import { Button, Spinner } from '../components/ui'

export default function HostRedirect() {
  const navigate = useNavigate()
  const [hostSlug, setHostSlug] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    getCurrentHost()
      .then(({ host }) => {
        if (active) setHostSlug(host.slug)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => { active = false }
  }, [])

  if (hostSlug) {
    return <Navigate to={`/hosts/${encodeURIComponent(hostSlug)}/campaigns`} replace />
  }
  if (!failed) return <Spinner />

  return (
    <main style={S.page}>
      <div style={S.state}>
        <h1 style={S.title}>ยังไม่มี Host ที่เปิดให้บริการ</h1>
        <p style={S.text}>กลับมาดูแคมเปญใหม่อีกครั้งเร็วๆ นี้</p>
        <Button type="button" onClick={() => navigate('/map')}>กลับไปแผนที่</Button>
      </div>
    </main>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 430,
    minHeight: '100vh',
    margin: '0 auto',
    padding: '24px 20px',
    background: 'var(--background)',
  },
  state: {
    minHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  title: {
    margin: 0,
    fontFamily: 'var(--font-brand)',
    fontSize: 24,
  },
  text: {
    margin: '10px 0 22px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
}
