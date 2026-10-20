import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LedgerFilter } from '../../lib/finance.ts'
import { Icon } from '../../components/Icon.tsx'
import { EmptyState, SearchField } from '../../components/Overlay.tsx'
import { displayName } from '../../lib/label.ts'
import { totalsBetween, transactionVisible } from '../../lib/finance.ts'
import { formatHKD } from '../../lib/money.ts'
import { periodBounds } from '../../lib/period.ts'
import { useFab } from '../../lib/useFab.ts'
import { useStore } from '../../store/useStore.ts'
import { FilterSheet, PeriodControls, TxnRow, openTxn, openTxnEdit } from './shared.tsx'

const emptyFilter: LedgerFilter = { type: 'all', accountIds: [], categoryIds: [], query: '' }

export function ActivityPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const transactions = useStore((state) => state.transactions)
  const categories = useStore((state) => state.categories)
  const accounts = useStore((state) => state.accounts)
  const period = useStore((state) => state.period)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<LedgerFilter>(emptyFilter)
  const [open, setOpen] = useState(false)
  useFab(true, () => openTxn(navigate, location))
  const bounds = periodBounds(period)
  const visible = useMemo(
    () => transactions.filter((tx) => {
      const category = categories.find((item) => item.id === tx.categoryId)
      const account = accounts.find((item) => item.id === tx.accountId)
      const other = accounts.find((item) => item.id === tx.toAccountId)
      return transactionVisible(tx, transactions, { ...filter, query }, bounds.start, bounds.end, {
        category: category ? displayName(category, t) : '',
        account: account ? displayName(account, t) : '',
        otherAccount: other ? displayName(other, t) : '',
      })
    }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions, categories, accounts, filter, query, bounds.start, bounds.end, t],
  )
  const totals = totalsBetween(visible, bounds.start, bounds.end)
  const pills = [
    filter.type !== 'all' ? { key: 'type', label: t(`ledger.${filter.type}`) } : null,
    ...filter.accountIds.map((id) => ({ key: `a-${id}`, label: displayName(accounts.find((item) => item.id === id) ?? { nameKey: null, customName: '' }, t) })),
    ...filter.categoryIds.map((id) => ({ key: `c-${id}`, label: displayName(categories.find((item) => item.id === id) ?? { nameKey: null, customName: '' }, t) })),
  ].filter((item): item is { key: string; label: string } => Boolean(item))

  return (
    <div className="page">
      <div className="page-head">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate('/ledger')}><Icon name="back" /></button>
        <strong className="head-title">{t('ledger.activity')}</strong>
        <span className="icon-spacer" />
      </div>
      <PeriodControls />
      <SearchField value={query} onChange={setQuery} placeholder={t('common.search')} />
      <div className="tool-row">
        <button type="button" className="text-btn" onClick={() => setOpen(true)}>{t('ledger.filter')}</button>
        {pills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            className="chip on"
            onClick={() => {
              if (pill.key === 'type') setFilter({ ...filter, type: 'all' })
              else if (pill.key.startsWith('a-')) setFilter({ ...filter, accountIds: filter.accountIds.filter((id) => `a-${id}` !== pill.key) })
              else setFilter({ ...filter, categoryIds: filter.categoryIds.filter((id) => `c-${id}` !== pill.key) })
            }}
          >
            {pill.label} ×
          </button>
        ))}
      </div>
      <div className="split">
        <article className="card stat"><span>{t('ledger.income')}</span><strong className="pos">{formatHKD(totals.income)}</strong></article>
        <article className="card stat"><span>{t('ledger.expense')}</span><strong>{formatHKD(totals.expense)}</strong></article>
      </div>
      <p className="count-line">{t('ledger.countLine', { count: visible.length, amount: formatHKD(totals.balance) })}</p>
      <div className="list">
        {visible.length ? visible.map((item) => <TxnRow key={item.id} tx={item} onClick={() => openTxnEdit(navigate, item.id, location)} />) : <EmptyState pose="ledger-empty" text={t('ledger.empty')} compact={transactions.length > 0} />}
      </div>
      <FilterSheet open={open} value={{ ...filter, query }} onClose={() => setOpen(false)} onApply={(next) => setFilter({ ...next, query: '' })} />
    </div>
  )
}
