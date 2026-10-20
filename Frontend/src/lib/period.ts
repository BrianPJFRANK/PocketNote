import type { Period } from '../domain/types.ts'
import { addDays, formatMonthDay, formatMonthTitle, isoDate, monthKey, parseISODate, parseMonthKey, shiftMonthKey, startOfWeek } from './date.ts'

export function periodBounds(period: Period): { start: string; end: string } {
  if (period.kind === 'week') {
    return { start: period.start, end: isoDate(addDays(parseISODate(period.start), 6)) }
  }
  if (period.kind === 'month') {
    const start = parseMonthKey(period.start <= period.end ? period.start : period.end)
    const endMonth = parseMonthKey(period.end >= period.start ? period.end : period.start)
    const end = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0)
    return { start: isoDate(start), end: isoDate(end) }
  }
  if (period.kind === 'year') {
    const start = Math.min(period.start, period.end)
    const end = Math.max(period.start, period.end)
    return { start: `${start}-01-01`, end: `${end}-12-31` }
  }
  return period.start <= period.end
    ? { start: period.start, end: period.end }
    : { start: period.end, end: period.start }
}

export function inPeriod(date: string, period: Period): boolean {
  const { start, end } = periodBounds(period)
  return date >= start && date <= end
}

export function currentMonthPeriod(now = new Date()): Period {
  const key = monthKey(now)
  return { kind: 'month', start: key, end: key }
}

export function shiftPeriod(period: Period, dir: -1 | 1): Period {
  if (period.kind === 'week') {
    return { kind: 'week', start: isoDate(addDays(parseISODate(period.start), 7 * dir)) }
  }
  if (period.kind === 'month') {
    return { kind: 'month', start: shiftMonthKey(period.start, dir), end: shiftMonthKey(period.end, dir) }
  }
  if (period.kind === 'year') {
    return { kind: 'year', start: period.start + dir, end: period.end + dir }
  }
  const start = parseISODate(period.start)
  const end = parseISODate(period.end)
  const span = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const delta = Math.max(span, 1) * dir
  return { kind: 'custom', start: isoDate(addDays(start, delta)), end: isoDate(addDays(end, delta)) }
}

export function formatPeriod(period: Period, locale: string): string {
  if (period.kind === 'month' && period.start === period.end) {
    return formatMonthTitle(parseMonthKey(period.start), locale)
  }
  if (period.kind === 'year' && period.start === period.end) {
    return new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(period.start, 0, 1))
  }
  if (period.kind === 'year') {
    const start = Math.min(period.start, period.end)
    const end = Math.max(period.start, period.end)
    return `${start} – ${end}`
  }
  const { start, end } = periodBounds(period)
  return `${formatMonthDay(parseISODate(start), locale)} – ${formatMonthDay(parseISODate(end), locale)}`
}

export function weekPeriod(anchor: Date): Period {
  return { kind: 'week', start: isoDate(startOfWeek(anchor)) }
}
