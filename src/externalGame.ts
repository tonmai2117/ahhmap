// Compatibility boundary for the unmodified map. AR and reward services are
// outside this standalone app; no collection can succeed without a backend.
export const AR_HIDE_SEEK_CONTENT = 'ar-hide-seek'

export type DemoLaunch = {
  treasureId: string
  claim: 'earned' | 'already'
  url: string
}

export function arHideSeekBaseUrl(): null {
  return null
}

export function regularArPath(_treasure: {
  id: string
  lat: number
  lng: number
  arContent: string | null
  name: string
}): string {
  return '/map'
}

export function buildArHideSeekDemoUrl(
  baseUrl: string,
  params: { claim: 'earned' | 'already'; reward: number; treasure: string },
): string {
  const url = new URL(baseUrl)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  return url.href
}

export function demoLaunchForTreasure(
  launch: DemoLaunch | null,
  treasureId: string | null,
): DemoLaunch | null {
  return launch?.treasureId === treasureId ? launch : null
}

export async function collectThenOpenArHideSeek(options: {
  baseUrl: string
  treasure: string
  collect: () => Promise<{ collected: true; coins_earned: number }>
  onCollected: (url: string, result: { collected: true; coins_earned: number }) => void
  open: (url: string) => void
}): Promise<void> {
  const result = await options.collect()
  const url = buildArHideSeekDemoUrl(options.baseUrl, {
    claim: 'earned', reward: result.coins_earned, treasure: options.treasure,
  })
  options.onCollected(url, result)
  options.open(url)
}