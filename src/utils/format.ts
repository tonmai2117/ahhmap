export function formatThaiDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'long' })
}

const BANGKOK_SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Bangkok',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function formatThaiShortDate(iso: string): string {
  return BANGKOK_SHORT_DATE.format(new Date(iso))
}
