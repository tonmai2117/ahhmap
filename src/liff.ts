import type { LineProfile } from './components/LineProfileCard'

// The standalone map opens in any browser without LINE authentication.
export async function getProfile(): Promise<LineProfile> {
  return null
}

export function openExternalWindow(value: string): void {
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('invalid_external_url')
  }
  window.open(url.href, '_blank', 'noopener,noreferrer')
}