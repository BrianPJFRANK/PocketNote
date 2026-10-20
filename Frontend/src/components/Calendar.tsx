import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays, daysInMonth, formatMonthTitle, isoDate, startOfWeek, weekdayNarrow } from '../lib/date.ts'
import { Icon } from './Icon.tsx'

export function Calendar({
  cursor,
  onCursor,
  selected,
  onSelect,
  marks,
  highlight,
  minDate,
  hidePrev = false,
  right,
}: {
  cursor: Date
  onCursor: (date: Date) => void
  selected: string | null
  onSelect: (iso: string) => void
  marks?: Set<string>
  highlight?: Set<string>
  minDate?: string | null
  hidePrev?: boolean
  right?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const count = daysInMonth(year, month)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const labels = useMemo(() => {
    const monday = startOfWeek(new Date(2024, 0, 1))
    return Array.from({ length: 7 }, (_, index) => weekdayNarrow(addDays(monday, index), i18n.language))
  }, [i18n.language])
  const today = isoDate(new Date())

  return (
    <div className="cal">
      <div className="cal-head">
        {hidePrev ? (
          <span className="icon-spacer" />
        ) : (
          <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => onCursor(new Date(year, month - 1, 1))}>
            <Icon name="chevronLeft" />
          </button>
        )}
        <strong>{formatMonthTitle(new Date(year, month, 1), i18n.language)}</strong>
        <button type="button" className="icon-btn" aria-label={t('common.more')} onClick={() => onCursor(new Date(year, month + 1, 1))}>
          <Icon name="chevronRight" />
        </button>
        {right}
      </div>
      <div className="cal-grid">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`} className="cal-dow">
            {label}
          </span>
        ))}
        {Array.from({ length: offset }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const iso = isoDate(new Date(year, month, index + 1))
          const disabled = !!minDate && iso < minDate
          const className = ['cal-day', selected === iso ? 'selected' : '', iso === today ? 'today' : '', highlight?.has(iso) ? 'in-range' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <button key={iso} type="button" className={className} disabled={disabled} onClick={() => onSelect(iso)}>
              <span>{index + 1}</span>
              {marks?.has(iso) ? <i className="dot" /> : <i className="dot ghost" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
