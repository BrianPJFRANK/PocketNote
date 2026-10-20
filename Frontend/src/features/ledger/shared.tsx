import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Location, NavigateFunction } from 'react-router-dom'
import type { LedgerFilter } from '../../lib/finance.ts'
import type { Period, Transaction } from '../../domain/types.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { Calendar } from '../../components/Calendar.tsx'
import { Icon } from '../../components/Icon.tsx'
import { BottomSheet, SheetHeader } from '../../components/Overlay.tsx'
import { TXN_ICON } from '../../domain/icons.ts'
import { formatMonthDay, isoDate, monthKey, parseISODate, parseMonthKey, todayISO } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { formatHKD } from '../../lib/money.ts'
import { currentMonthPeriod, formatPeriod, weekPeriod } from '../../lib/period.ts'
import { useStore } from '../../store/useStore.ts'

export function TxnRow({ tx, onClick, largeIcon = false }: { tx: Transaction; onClick: () => void; largeIcon?: boolean }) {
  const { t, i18n } = useTranslation()
  const categories = useStore((state) => state.categories)
  const accounts = useStore((state) => state.accounts)
  const transactions = useStore((state) => state.transactions)
  const origin = tx.refundOfId ? transactions.find((item) => item.id === tx.refundOfId) : undefined
  const category = categories.find((item) => item.id === tx.categoryId)
  const account = accounts.find((item) => item.id === tx.accountId)
  const other = accounts.find((item) => item.id === tx.toAccountId)
  const date = formatMonthDay(parseISODate(tx.date), i18n.language)
  let title = category ? displayName(category, t) : t('common.category')
  let sub = `${date}${account ? ` · ${displayName(account, t)}` : ''}`
  let emoji = category?.icon ?? TXN_ICON[tx.type]
  let iconId = category?.id ?? `txn.${tx.type}`
  if (tx.type === 'transfer') {
    title = t('ledger.transfer')
    sub = `${account ? displayName(account, t) : ''} → ${other ? displayName(other, t) : ''} · ${date}`
    emoji = TXN_ICON.transfer
    iconId = 'txn.transfer'
  } else if (tx.type === 'refund') {
    const originCategory = categories.find((item) => item.id === origin?.categoryId)
    title = t('ledger.refund')
    sub = `${originCategory ? displayName(originCategory, t) : ''} · ${date}`
    emoji = TXN_ICON.refund
    iconId = 'txn.refund'
  }
  const money = formatHKD(tx.amount)
  const text = tx.type === 'expense' || (tx.type === 'refund' && origin?.type === 'income') ? `-${money}` : tx.type === 'income' || tx.type === 'refund' ? `+${money}` : money
  const tone = tx.type === 'income' || (tx.type === 'refund' && origin?.type !== 'income') ? 'pos' : tx.type === 'transfer' ? 'muted' : ''

  return (
    <button type="button" className="txn" onClick={onClick}>
      <span className="txn-ico">
        <CategoryIcon id={iconId} emoji={emoji} fit={largeIcon} />
      </span>
      <span className="txn-copy">
        <strong>{title}</strong>
        <em>{sub}</em>
      </span>
      <span className={`amt ${tone}${tx.type === 'income' ? ' income' : ''}`}>{text}</span>
    </button>
  )
}

export function PeriodControls({ trailing }: { trailing?: ReactNode }) {
  const { i18n, t } = useTranslation()
  const period = useStore((state) => state.period)
  const shiftPeriod = useStore((state) => state.shiftPeriod)
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="period">
        <div className="period-cluster">
          <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => shiftPeriod(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="period-label" onClick={() => setOpen(true)}>
            {formatPeriod(period, i18n.language)}
          </button>
          <button type="button" className="icon-btn" aria-label={t('common.more')} onClick={() => shiftPeriod(1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
        {trailing ? <div className="period-side">{trailing}</div> : null}
      </div>
      <RangeSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function RangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const period = useStore((state) => state.period)
  const setPeriod = useStore((state) => state.setPeriod)
  const [draft, setDraft] = useState<Period>(period)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [customCursor, setCustomCursor] = useState(() => new Date())
  const [customSide, setCustomSide] = useState<'start' | 'end'>('start')
  useEffect(() => {
    if (!open) return
    setDraft(period)
    if (period.kind === 'month') setYear(Number(period.start.slice(0, 4)))
    if (period.kind === 'year') setYear(period.start)
  }, [open, period])

  function chooseKind(kind: Period['kind']) {
    const now = new Date()
    if (kind === 'week') setDraft(weekPeriod(now))
    if (kind === 'month') setDraft(currentMonthPeriod(now))
    if (kind === 'year') setDraft({ kind: 'year', start: now.getFullYear(), end: now.getFullYear() })
    if (kind === 'custom') {
      const today = todayISO()
      setDraft({ kind: 'custom', start: today, end: today })
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={t('ledger.chooseRange')} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body stack">
        <div className="seg">
          {(['week', 'month', 'year', 'custom'] as Period['kind'][]).map((kind) => (
            <button key={kind} type="button" className={draft.kind === kind ? 'on' : ''} onClick={() => chooseKind(kind)}>
              {t(`ledger.${kind}`)}
            </button>
          ))}
        </div>
        {draft.kind === 'week' ? (
          <Calendar
            cursor={customCursor}
            onCursor={setCustomCursor}
            selected={draft.start}
            highlight={weekDays(draft.start)}
            onSelect={(iso) => setDraft(weekPeriod(parseISODate(iso)))}
          />
        ) : null}
        {draft.kind === 'month' ? (
          <>
            <div className="period">
              <button type="button" className="icon-btn" onClick={() => setYear((value) => value - 1)} aria-label={t('common.back')}><Icon name="chevronLeft" /></button>
              <strong>{year}</strong>
              <button type="button" className="icon-btn" onClick={() => setYear((value) => value + 1)} aria-label={t('common.more')}><Icon name="chevronRight" /></button>
            </div>
            <div className="grid-3">
              {Array.from({ length: 12 }, (_, index) => {
                const key = monthKey(new Date(year, index, 1))
                const on = draft.kind === 'month' && key >= draft.start && key <= draft.end
                return (
                  <button
                    key={key}
                    type="button"
                    className={on ? 'mini-card on' : 'mini-card'}
                    onClick={() => {
                      if (draft.kind !== 'month') return
                      if (draft.start === draft.end && draft.start !== key) {
                        setDraft({ kind: 'month', start: draft.start < key ? draft.start : key, end: draft.start < key ? key : draft.start })
                      } else setDraft({ kind: 'month', start: key, end: key })
                    }}
                  >
                    {new Intl.DateTimeFormat(undefined, { month: 'short' }).format(parseMonthKey(key))}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
        {draft.kind === 'year' ? (
          <div className="grid-3">
            {Array.from({ length: 9 }, (_, index) => year - 6 + index).map((item) => {
              const on = item >= Math.min(draft.start, draft.end) && item <= Math.max(draft.start, draft.end)
              return (
                <button
                  key={item}
                  type="button"
                  className={on ? 'mini-card on' : 'mini-card'}
                  onClick={() => {
                    if (draft.kind !== 'year') return
                    if (draft.start === draft.end && draft.start !== item) {
                      setDraft({ kind: 'year', start: Math.min(draft.start, item), end: Math.max(draft.start, item) })
                    } else setDraft({ kind: 'year', start: item, end: item })
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        ) : null}
        {draft.kind === 'custom' ? (
          <>
            <div className="seg">
              <button type="button" className={customSide === 'start' ? 'on' : ''} onClick={() => setCustomSide('start')}>{t('ledger.start')}</button>
              <button type="button" className={customSide === 'end' ? 'on' : ''} onClick={() => setCustomSide('end')}>{t('ledger.end')}</button>
            </div>
            <Calendar
              cursor={customCursor}
              onCursor={setCustomCursor}
              selected={customSide === 'start' ? draft.start : draft.end}
              onSelect={(iso) => {
                if (customSide === 'start') setDraft({ kind: 'custom', start: iso, end: draft.end < iso ? iso : draft.end })
                else setDraft({ kind: 'custom', start: draft.start > iso ? iso : draft.start, end: iso })
              }}
            />
          </>
        ) : null}
        <button type="button" className="btn primary" onClick={() => { setPeriod(draft); onClose() }}>{t('common.apply')}</button>
      </div>
    </BottomSheet>
  )
}

function weekDays(start: string): Set<string> {
  const days = new Set<string>()
  for (let index = 0; index < 7; index += 1) days.add(isoDate(new Date(parseISODate(start).getFullYear(), parseISODate(start).getMonth(), parseISODate(start).getDate() + index)))
  return days
}

export function FilterSheet({ open, value, onClose, onApply }: { open: boolean; value: LedgerFilter; onClose: () => void; onApply: (filter: LedgerFilter) => void }) {
  const { t } = useTranslation()
  const categories = useStore((state) => state.categories)
  const accounts = useStore((state) => state.accounts)
  const [draft, setDraft] = useState(value)
  useEffect(() => { if (open) setDraft(value) }, [open, value])
  const expense = categories.filter((item) => item.kind === 'expense')
  const income = categories.filter((item) => item.kind === 'income')
  const groups = draft.type === 'expense' ? [['', expense] as const] : draft.type === 'income' ? [['', income] as const] : draft.type === 'transfer' ? [] : [[t('ledger.expense'), expense] as const, [t('ledger.income'), income] as const]

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader
        title={t('ledger.filter')}
        onClose={onClose}
        closeLabel={t('common.close')}
        right={<button type="button" className="text-btn" onClick={() => setDraft({ type: 'all', accountIds: [], categoryIds: [], query: draft.query })}>{t('common.clearAll')}</button>}
      />
      <div className="sheet-body stack">
        <div className="seg">
          {(['all', 'expense', 'income', 'transfer'] as LedgerFilter['type'][]).map((item) => (
            <button key={item} type="button" className={draft.type === item ? 'on' : ''} onClick={() => setDraft({ ...draft, type: item, categoryIds: [] })}>
              {item === 'all' ? t('common.all') : t(`ledger.${item}`)}
            </button>
          ))}
        </div>
        <h3>{t('common.account')}</h3>
        <div className="chips">
          {accounts.map((item) => (
            <button key={item.id} type="button" className={draft.accountIds.includes(item.id) ? 'chip on' : 'chip'} onClick={() => setDraft({ ...draft, accountIds: toggle(draft.accountIds, item.id) })}>
              {displayName(item, t)}
            </button>
          ))}
        </div>
        {groups.map(([label, list]) => (
          <div key={label || 'cats'} className="stack">
            {label ? <h3>{label}</h3> : <h3>{t('common.category')}</h3>}
            <div className="chips">
              {list.map((item) => (
                <button key={item.id} type="button" className={draft.categoryIds.includes(item.id) ? 'chip on' : 'chip'} onClick={() => setDraft({ ...draft, categoryIds: toggle(draft.categoryIds, item.id) })}>
                  {displayName(item, t)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="btn primary" onClick={() => { onApply(draft); onClose() }}>{t('common.apply')}</button>
      </div>
    </BottomSheet>
  )
}

export function openTxn(navigate: NavigateFunction, background: Location) {
  navigate('/ledger/new', { state: { from: background.pathname, background } })
}

export function openTxnEdit(navigate: NavigateFunction, id: string, background: Location) {
  navigate(`/ledger/edit/${id}`, { state: { from: background.pathname, background } })
}
