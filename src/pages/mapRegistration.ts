export function mapRegistrationPath(pathname: string, search: string): string {
  const next = `${pathname}${search}`
  return `/register?next=${encodeURIComponent(next)}`
}
