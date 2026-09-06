import { clearReauthGuard, getIdToken, getLineAccessToken, reauthenticate } from './liff'

const configuredBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/+$/, '')
const BASE = configuredBase
  ? configuredBase.endsWith('/api') ? configuredBase : `${configuredBase}/api`
  : '/api'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getIdToken()}`,
      'X-Line-Access-Token': getLineAccessToken(),
      ...(init.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    if (body.error === 'line_friend_required') {
      window.dispatchEvent(new Event('line-friend-required'))
    }
    // An hour-old id token is not something the player can act on — get a fresh
    // one and come back to the same screen. The throw still runs; the login or
    // reload navigates away before anything downstream renders.
    if (res.status === 401 && body.error === 'invalid_token') reauthenticate()
    throw new ApiError(res.status, body.error ?? 'request_failed')
  }

  clearReauthGuard()
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  delete: <T>(path: string)                => request<T>(path, { method: 'DELETE' }),
}
