import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ApiError, api } from '../api'
import { useShopAccess } from './shopAccess'

vi.mock('../api', () => ({
  ApiError: class ApiError extends Error { constructor(public status: number, message: string) { super(message) } },
  api: { get: vi.fn() },
}))

function GuardProbe() {
  const state = useShopAccess()
  const location = useLocation()
  return <p>{`${location.pathname}:${state.loading}:${state.error}`}</p>
}

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Shop access guard', () => {
  it('redirects a Player away from Shop routes before a Shop endpoint can load', async () => {
    vi.mocked(api.get).mockResolvedValue({ user: { role: 'player' } })
    render(<MemoryRouter initialEntries={['/shop/coupons']}><GuardProbe /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('/map:true:')).toBeTruthy())
    expect(api.get).toHaveBeenCalled()
    expect(vi.mocked(api.get).mock.calls.every(([path]) => path === '/me')).toBe(true)
  })

  it('redirects incomplete registration to Register', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(409, 'registration_incomplete'))
    render(<MemoryRouter initialEntries={['/shop/stats']}><GuardProbe /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('/register:true:')).toBeTruthy())
  })
})
