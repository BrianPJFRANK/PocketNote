export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(now = new Date()): string {
  return isoDate(startOfDay(now))
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getDate()
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())))
  return next
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date)
  const weekday = day.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  return addDays(day, diff)
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1)
}

export function shiftMonthKey(key: string, delta: number): string {
  return monthKey(addMonths(parseMonthKey(key), delta))
}

export function formatMonthTitle(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date)
}

export function formatMonthDay(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(date)
}

export function formatStamp(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

export function weekdayNarrow(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date)
}

export function weekdayLong(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
}

export function dueForMonthDay(day: number, from = new Date()): string {
  const today = startOfDay(from)
  const dim = daysInMonth(today.getFullYear(), today.getMonth())
  const candidate = new Date(today.getFullYear(), today.getMonth(), Math.min(day, dim))
  if (candidate.getTime() >= today.getTime()) return isoDate(candidate)
  const next = addMonths(new Date(today.getFullYear(), today.getMonth(), 1), 1)
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())))
  return isoDate(next)
}

export function sameDayNextMonth(due: string, day: number): string {
  const current = parseISODate(due)
  const next = addMonths(new Date(current.getFullYear(), current.getMonth(), 1), 1)
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())))
  return isoDate(next)
}

export function eachDate(start: string, end: string): string[] {
  const days: string[] = []
  let cursor = parseISODate(start)
  const last = parseISODate(end)
  while (cursor.getTime() <= last.getTime()) {
    days.push(isoDate(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}
