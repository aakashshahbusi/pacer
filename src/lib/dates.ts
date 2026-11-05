/** All dates in Pacer are local-time ISO day strings: YYYY-MM-DD. */

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime()
  return Math.round(ms / 86_400_000)
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function dowShort(iso: string): string {
  return DOW[fromISO(iso).getDay()]
}

/** "Sun, Nov 8" */
export function formatShort(iso: string): string {
  const d = fromISO(iso)
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** "Sunday, November 8" */
export function formatLong(iso: string): string {
  const d = fromISO(iso)
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${DOW_LONG[d.getDay()]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`
}

/** "Nov 8" */
export function formatMonthDay(iso: string): string {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

/** "Nov 8, 2026" */
export function formatMonthDayYear(iso: string): string {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

/** Seconds → "m:ss" or "h:mm:ss". */
export function fmtClock(totalSec: number, forceHours = false): string {
  const s = Math.round(totalSec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0 || forceHours) return `${h}:${pad(m)}:${pad(sec)}`
  return `${m}:${pad(sec)}`
}

/**
 * "mm:ss" or "h:mm:ss" → seconds, or null when unparseable.
 * Digits-only input is accepted too (the iOS number pad has no colon): "2200" → 22:00, "20500" → 2:05:00.
 */
export function parseClock(text: string): number | null {
  const t = text.trim()
  if (/^\d{3,6}$/.test(t)) {
    const sec = Number(t.slice(-2))
    const min = Number(t.slice(-4, -2))
    const hr = t.length > 4 ? Number(t.slice(0, -4)) : 0
    if (sec >= 60 || min >= 60) return null
    return hr * 3600 + min * 60 + sec
  }
  const parts = t.split(':').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => p === '' || !/^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  if (nums.length === 2) return nums[0] * 60 + nums[1]
  return nums[0] * 3600 + nums[1] * 60 + nums[2]
}

export function nowISO(): string {
  return new Date().toISOString()
}

/** Monday-based ISO week start for an ISO date. */
export function mondayOf(iso: string): string {
  const d = fromISO(iso)
  const day = d.getDay() // 0 Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISO(d)
}
