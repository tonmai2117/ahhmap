import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { holderRouteForMeError } from './holderRouting'
import { userFacingError } from '../utils/errors'

export function useShopAccess() {
  const navigate = useNavigate()
  const [state, setState] = useState<{ loading: boolean; error: string }>({ loading: true, error: '' })
  useEffect(() => {
    let active = true
    api.get<{ user: { role: string } }>('/me').then(({ user }) => {
      if (!active) return
      if (user.role !== 'holder') navigate('/map', { replace: true })
      else setState({ loading: false, error: '' })
    }).catch((err) => {
      if (!active) return
      const route = holderRouteForMeError(err)
      if (route) navigate(route, { replace: true })
      else setState({ loading: false, error: userFacingError(err, 'ตรวจสอบสถานะร้านไม่ได้ กรุณาลองใหม่') })
    })
    return () => { active = false }
  }, [navigate])
  return state
}
