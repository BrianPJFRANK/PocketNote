import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Transaction } from '../../domain/types.ts'
import type { LedgerFilter } from '../../lib/finance.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { NetChart, Pie, StackedBars } from '../../components/Charts.tsx'
import { categoryColor } from '../../domain/categoryColor.ts'
import { MenuButton } from '../../components/Icon.tsx'
import { EmptyState } from '../../components/Overlay.tsx'
import { categoryTotals, monthAmount, totalsBetween } from '../../lib/finance.ts'
import { addMonths, monthKey } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { formatHKD, roundMoney } from '../../lib/money.ts'
import { formatPeriod, periodBounds } from '../../lib/period.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { FilterSheet, PeriodControls } from './shared.tsx'
import expenseArt from '../../assets/txn_categories/txn_expense.png'
import incomeArt from '../../assets/txn_categories/txn_income.png'
import netArt from '../../assets/txn_categories/txn_transaction.png'

const emptyFilter: LedgerFilter = { type: 'all', accountIds: [], categoryIds: [], query: '' }
const otherColor = '#D9D2E6'

function monthBounds(key: string): { start: string; end: string } {
  const [year, mon] = key.split('-').map(Number)
  const endDate = new Date(year, mon, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return { start: `${key}-01`, end }
}

export function ReportsPage() {
  const { t, i18n } = useTranslation()
  const setDrawer = useUi((state) => state.setDrawer)
  const transactions = useStore((state) => state.transactions)
  const categories = useStore((state) => state.categories)
  const period = useStore((state) => state.period)
  const budgetTotal = useStore((state) => state.budgetTotal)
  const [mode, setMode] = useState<'expense' | 'income' | 'net'>('expense')
  const [months, setMonths] = useState<3 | 6 | 12>(6)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filter, setFilter] = useState<LedgerFilter>(emptyFilter)
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
  const top = slices.slice(0, 5)
  const other = roundMoney(sum - top.reduce((total, item) => total + item.amount, 0))
  const pieSlices = [
    ...top.map((item) => ({ amount: item.amount, color: categoryColor(item.id) ?? otherColor })),
    ...(other > 0 ? [{ amount: other, color: otherColor }] : []),
  ]
  const keys = Array.from({ length: months }, (_, index) => monthKey(addMonths(new Date(), index - months + 1)))
  const incomeSeries = keys.map((key) => monthAmount(filtered, key, 'income'))
  const expenseSeries = keys.map((key) => monthAmount(filtered, key, 'expense'))
  const trend = useMemo(() => buildTrend(filtered, keys, kind), [filtered, keys, kind])
  const periodLabel = formatPeriod(period, i18n.language)
  const heroLabel = mode === 'income' ? t('ledger.totalIncome') : mode === 'net' ? t('ledger.totalNet') : t('ledger.totalExpense')
  const heroAmount = mode === 'income' ? totals.income : mode === 'net' ? totals.balance : totals.expense
  const leader = top[0]
  const leaderName = leader ? nameOf(leader.id, categories, t) : ''
  const leaderPct = leader && sum > 0 ? Math.round((leader.amount / sum) * 100) : 0
  const summary = summaryText(mode, heroAmount, totals, budgetTotal, leaderName, leaderPct, t)

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <PeriodControls trailing={<button type="button" className="text-btn" onClick={() => setFilterOpen(true)}>{t('ledger.filter')}</button>} />
      </div>
      <div className="seg txn-types">
        {([['expense', expenseArt], ['income', incomeArt], ['net', netArt]] as const).map(([item, art]) => (
          <button key={item} type="button" className={mode === item ? 'on' : ''} onClick={() => setMode(item)}>
            <img src={art} alt="" />
            <span>{t(`ledger.${item}`)}</span>
          </button>
        ))}
      </div>
      <article className={`report-hero ${mode}${mode === 'net' && heroAmount > 0 ? ' up' : ''}${mode === 'net' && heroAmount < 0 ? ' down' : ''}`}>
        <p className="report-card-title">{t('ledger.overview')}</p>
        <p className="report-hero-kicker">{heroLabel} · {periodLabel}</p>
        <p className="report-hero-amount">{formatHKD(heroAmount)}</p>
        <div className="report-hero-note">
          <i />
          <p>{summary}</p>
        </div>
      </article>
      {mode === 'net' ? null : (
        <article className="card">
          <h3 className="report-card-title">{t('ledger.detail')}</h3>
          {sum ? (
            <>
              <div className="report-pie">
                <Pie donut slices={pieSlices} />
                <ul className="report-side">
                  {top.map((item) => (
                    <li key={item.id}>
                      <i style={{ background: categoryColor(item.id) }} />
                      <span>{nameOf(item.id, categories, t)}</span>
                      <b>{Math.round((item.amount / sum) * 100)}%</b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="report-rule" />
              {top.map((item) => {
                const category = categories.find((entry) => entry.id === item.id)
                const pct = Math.round((item.amount / sum) * 100)
                return (
                  <div key={item.id} className="report-line">
                    <CategoryIcon id={item.id} emoji={category?.icon ?? '✨'} size={48} />
                    <span className="report-line-mid">
                      <strong>{nameOf(item.id, categories, t)}</strong>
                      <div className="bar"><span style={{ width: `${pct}%`, background: categoryColor(item.id) }} /></div>
                    </span>
                    <span className="report-line-end">
                      <b className="report-amt">{formatHKD(item.amount)}</b>
                      <b className="report-pct">{pct}%</b>
                    </span>
                  </div>
                )
              })}
            </>
          ) : <EmptyState text={t('ledger.noChart')} compact />}
        </article>
      )}
      <article className="card stack">
        <div className="row-btn static report-chart-head">
          <strong>{mode === 'net' ? t('ledger.compare') : t('ledger.trend')}</strong>
          <div className="seg tiny">
            <button type="button" className={months === 3 ? 'on' : ''} onClick={() => setMonths(3)}>{t('ledger.m3')}</button>
            <button type="button" className={months === 6 ? 'on' : ''} onClick={() => setMonths(6)}>{t('ledger.m6')}</button>
            <button type="button" className={months === 12 ? 'on' : ''} onClick={() => setMonths(12)}>{t('ledger.m12')}</button>
          </div>
        </div>
        <div className="report-plot">
          {mode === 'net' ? <NetChart income={incomeSeries} expense={expenseSeries} /> : <StackedBars columns={trend.columns} />}
          <div className="axis bars" style={{ gridTemplateColumns: `repeat(${keys.length}, 1fr)` }}>{keys.map((key) => <span key={key}>{key.slice(5)}</span>)}</div>
        </div>
        {mode === 'net' ? null : (
          <div className="report-key">
            {trend.legend.map((item) => (
              <span key={item.id}>
                <i style={{ background: item.color }} />
                <em>{item.id === 'other' ? t('ledger.reportOther') : nameOf(item.id, categories, t)}</em>
              </span>
            ))}
          </div>
        )}
      </article>
      <FilterSheet open={filterOpen} value={filter} onClose={() => setFilterOpen(false)} onApply={setFilter} />
    </div>
  )
}

function nameOf(id: string, categories: { id: string; nameKey: string | null; customName: string | null }[], t: (key: string) => string): string {
  const category = categories.find((entry) => entry.id === id)
  return category ? displayName(category, t) : id
}

function summaryText(
  mode: 'expense' | 'income' | 'net',
  amount: number,
  totals: { income: number; expense: number },
  budgetTotal: number | null,
  name: string,
  pct: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (mode === 'net') {
    if (totals.income === 0 && totals.expense === 0) return t('ledger.reportNoneNet')
    if (amount > 0) return t('ledger.reportNetUp', { amount: formatHKD(amount) })
    if (amount < 0) return t('ledger.reportNetDown', { amount: formatHKD(Math.abs(amount)) })
    return t('ledger.reportNetEven')
  }
  if (amount === 0 || !name) return t(mode === 'income' ? 'ledger.reportNoneIncome' : 'ledger.reportNoneExpense')
  if (mode === 'expense' && budgetTotal != null) {
    if (amount > budgetTotal) return t('ledger.reportOver', { amount: formatHKD(amount - budgetTotal), name, pct })
    return t('ledger.reportWithin', { amount: formatHKD(budgetTotal - amount), name, pct })
  }
  return t('ledger.reportTop', { name, pct })
}

function buildTrend(transactions: Transaction[], keys: string[], kind: 'expense' | 'income') {
  const perMonth = keys.map((key) => {
    const bounds = monthBounds(key)
    return categoryTotals(transactions, bounds.start, bounds.end, kind)
  })
  const totals = new Map<string, number>()
  perMonth.forEach((rows) => rows.forEach((row) => totals.set(row.id, (totals.get(row.id) ?? 0) + row.amount)))
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])
  const topIds = ranked.slice(0, 5).map(([id]) => id)
  const hasOther = ranked.length > 5 || perMonth.some((rows, index) => {
    const categorized = rows.reduce((sum, row) => sum + row.amount, 0)
    return roundMoney(monthAmount(transactions, keys[index], kind) - categorized) > 0
  })
  const legend = [
    ...topIds.map((id) => ({ id, color: categoryColor(id) ?? otherColor })),
    ...(hasOther ? [{ id: 'other', color: otherColor }] : []),
  ]
  const columns = perMonth.map((rows, index) => {
    const byId = new Map(rows.map((row) => [row.id, row.amount]))
    const segments = topIds.map((id) => ({ value: byId.get(id) ?? 0, color: categoryColor(id) ?? otherColor }))
    const known = topIds.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0)
    const monthTotal = monthAmount(transactions, keys[index], kind)
    const rest = roundMoney(monthTotal - known)
    if (rest > 0) segments.push({ value: rest, color: otherColor })
    return { segments }
  })
  return { legend, columns }
}
