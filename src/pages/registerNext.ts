const MAX_NEXT_LENGTH = 512

/** Allow only same-origin absolute paths suitable for react-router navigation. */
export function safeNext(raw: string | null): string | null {
  if (raw === null) return null
  if (raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return null
  if (!/^\/(?!\/)/.test(raw)) return null
  if (raw.includes('\\') || raw.includes(':')) return null
  return raw
}
