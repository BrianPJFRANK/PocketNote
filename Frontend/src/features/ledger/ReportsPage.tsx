import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LedgerFilter } from '../../lib/finance.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { LineChart, NetChart, Pie, pieColor } from '../../components/Charts.tsx'
import { MenuButton } from '../../components/Icon.tsx'
import { EmptyState } from '../../components/Overlay.tsx'
import { categoryTotals, monthAmount, totalsBetween } from '../../lib/finance.ts'
import { addMonths, monthKey } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { formatHKD } from '../../lib/money.ts'
import { periodBounds } from '../../lib/period.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { FilterSheet, PeriodControls } from './shared.tsx'

const emptyFilter: LedgerFilter = { type: 'all', accountIds: [], categoryIds: [], query: '' }

export function ReportsPage() {
  const { t } = useTranslation()
  const setDrawer = useUi((state) => state.setDrawer)
  const transactions = useStore((state) => state.transactions)
  const categories = useStore((state) => state.categories)
  const period = useStore((state) => state.period)
  const budgetTotal = useStore((state) => state.budgetTotal)
  const [mode, setMode] = useState<'expense' | 'income' | 'net'>('expense')
  const [months, setMonths] = useState<6 | 12>(6)
  const [showAll, setShowAll] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState<LedgerFilter>(emptyFilter)
  const [compareMonth, setCompareMonth] = useState(() => monthKey(addMonths(new Date(), -1)))
  const [compareYear, setCompareYear] = useState(() => new Date().getFullYear() - 1)
  const bounds = periodBounds(period)
  const filtered = useMemo(() => transactions.filter((tx) => {
    if (filter.accountIds.length && (!tx.accountId || !filter.accountIds.includes(tx.accountId))) return false
    if (filter.categoryIds.length && (!tx.categoryId || !filter.categoryIds.includes(tx.categoryId))) return false
    if (filter.type === 'transfer') return false
    if (filter.type === 'expense' && tx.type !== 'expense' && tx.type !== 'refund') return false
    if (filter.type === 'income' && tx.type !== 'income' && tx.type !== 'refund') return false
    return true
  }), [transactions, filter])
  const totals = totalsBetween(filtered, bounds.start, bounds.end)
  const kind = mode === 'income' ? 'income' : 'expense'
  const slices = categoryTotals(filtered, bounds.start, bounds.end, kind, filter.categoryIds, filter.accountIds)
  const sum = slices.reduce((total, item) => total + item.amount, 0)
  const shown = showAll ? slices : slices.slice(0, 5)
  const keys = Array.from({ length: months }, (_, index) => monthKey(addMonths(new Date(), index - months + 1)))
  const series = keys.map((key) => monthAmount(filtered, key, kind))
  const incomeSeries = keys.map((key) => monthAmount(filtered, key, 'income'))
  const expenseSeries = keys.map((key) => monthAmount(filtered, key, 'expense'))
  const compare = period.kind === 'year'
    ? totalsBetween(filtered, `${compareYear}-01-01`, `${compareYear}-12-31`)
    : period.kind === 'month'
      ? totalsBetween(filtered, `${compareMonth}-01`, isoEnd(compareMonth))
      : null

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <PeriodControls trailing={<button type="button" className="text-btn" onClick={() => setFilterOpen(true)}>{t('ledger.filter')}</button>} />
      </div>
      <div className="seg">
        <button type="button" className={mode === 'expense' ? 'on' : ''} onClick={() => setMode('expense')}>{t('ledger.expense')}</button>
        <button type="button" className={mode === 'income' ? 'on' : ''} onClick={() => setMode('income')}>{t('ledger.income')}</button>
        <button type="button" className={mode === 'net' ? 'on' : ''} onClick={() => setMode('net')}>{t('ledger.net')}</button>
      </div>
      {mode === 'net' ? (
        <article className="card stat"><span>{t('ledger.balance')}</span><strong>{formatHKD(totals.balance)}</strong></article>
      ) : (
        <article className="card stack">
          <div className="row-btn static">
            <strong>{formatHKD(mode === 'income' ? totals.income : totals.expense)}</strong>
          </div>
          {mode === 'expense' && budgetTotal != null ? (
            <p className="muted">{totals.expense > budgetTotal ? t('ledger.overLine', { amount: formatHKD(totals.expense - budgetTotal) }) : t('ledger.budgetLine', { budget: formatHKD(budgetTotal), actual: formatHKD(totals.expense), left: formatHKD(budgetTotal - totals.expense) })}</p>
          ) : null}
          {sum ? (
            <>
              <div className="chart-row">
                <Pie slices={slices.map((item, index) => ({ amount: item.amount, color: pieColor(index) }))} />
                <ul className="legend">
                  {slices.slice(0, 5).map((item, index) => {
                    const category = categories.find((entry) => entry.id === item.id)
                    return <li key={item.id}><i style={{ background: pieColor(index) }} />{category ? displayName(category, t) : item.id}<b>{Math.round((item.amount / sum) * 100)}%</b></li>
                  })}
                </ul>
              </div>
              {shown.map((item) => {
                const category = categories.find((entry) => entry.id === item.id)
                return (
                  <div key={item.id} className="budget-line">
                    <CategoryIcon id={item.id} emoji={category?.icon ?? '✨'} size={28} />
                    <span>
                      <strong>{category ? displayName(category, t) : item.id}</strong>
                      <div className="bar"><span style={{ width: `${(item.amount / sum) * 100}%` }} /></div>
                    </span>
                    <b>{Math.round((item.amount / sum) * 100)}% · {formatHKD(item.amount)}</b>
                  </div>
                )
              })}
              {slices.length > 5 ? <button type="button" className="text-btn" onClick={() => setShowAll((value) => !value)}>{showAll ? t('ledger.collapse') : t('ledger.showAll')}</button> : null}
            </>
          ) : <EmptyState text={t('ledger.noChart')} compact />}
          {!sum ? <p className="muted">{formatHKD(0)}</p> : null}
        </article>
      )}
      <article className="card stack">
        <div className="row-btn static">
          <strong>{mode === 'net' ? t('ledger.compare') : t('ledger.trend')}</strong>
          <div className="seg tiny">
            <button type="button" className={months === 6 ? 'on' : ''} onClick={() => setMonths(6)}>{t('ledger.m6')}</button>
            <button type="button" className={months === 12 ? 'on' : ''} onClick={() => setMonths(12)}>{t('ledger.m12')}</button>
          </div>
        </div>
        {mode === 'net' ? <NetChart income={incomeSeries} expense={expenseSeries} /> : <LineChart values={series} />}
        <div className="axis">{keys.map((key) => <span key={key}>{key.slice(5)}</span>)}</div>
      </article>
      {compare && (period.kind === 'month' || period.kind === 'year') ? (
        <article className="card stack">
          <h3>{t('ledger.compare')}</h3>
          {period.kind === 'month' ? <input className="field" type="month" value={compareMonth} onChange={(event) => setCompareMonth(event.target.value)} /> : (
            <input className="field" type="number" value={compareYear} onChange={(event) => setCompareYear(Number(event.target.value))} />
          )}
          <div className="split">
            <div><span>{t('ledger.income')}</span><strong className="pos">{formatHKD(totals.income)}</strong><em className="muted">{formatHKD(compare.income)}</em></div>
            <div><span>{t('ledger.expense')}</span><strong>{formatHKD(totals.expense)}</strong><em className="muted">{formatHKD(compare.expense)}</em></div>
          </div>
        </article>
      ) : null}
      <FilterSheet open={filterOpen} value={filter} onClose={() => setFilterOpen(false)} onApply={setFilter} />
    </div>
  )
}

function isoEnd(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  const end = new Date(year, mon, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}
