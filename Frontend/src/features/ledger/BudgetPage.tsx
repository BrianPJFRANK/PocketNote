import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { MenuButton } from '../../components/Icon.tsx'
import { Mascot } from '../../components/Mascot.tsx'
import { BottomSheet, SheetHeader } from '../../components/Overlay.tsx'
import { categoryTotals, totalsBetween } from '../../lib/finance.ts'
import { displayName } from '../../lib/label.ts'
import { formatHKD } from '../../lib/money.ts'
import { periodBounds } from '../../lib/period.ts'
import { useFab } from '../../lib/useFab.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { PeriodControls, openTxn } from './shared.tsx'

export function BudgetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setDrawer = useUi((state) => state.setDrawer)
  const categories = useStore((state) => state.categories)
  const transactions = useStore((state) => state.transactions)
  const period = useStore((state) => state.period)
  const budgetTotal = useStore((state) => state.budgetTotal)
  const budgetByCategory = useStore((state) => state.budgetByCategory)
  const setBudgetTotal = useStore((state) => state.setBudgetTotal)
  const setCategoryBudget = useStore((state) => state.setCategoryBudget)
  const [totalDraft, setTotalDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  useFab(true, () => openTxn(navigate, location))
  const bounds = periodBounds(period)
  const totals = totalsBetween(transactions, bounds.start, bounds.end)
  const byCat = categoryTotals(transactions, bounds.start, bounds.end, 'expense')
  const spentOf = (id: string) => byCat.find((item) => item.id === id)?.amount ?? 0
  const over = budgetTotal != null && totals.expense > budgetTotal
  const expenseCats = categories.filter((item) => item.kind === 'expense')

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <strong className="head-title">{t('nav.budget')}</strong>
        <span className="icon-spacer" />
      </div>
      <PeriodControls />
      <article className={over ? 'card stack budget-card over' : 'card stack budget-card'}>
        {over ? <><p className="banner">{t('ledger.overFlag')}</p><Mascot pose="worried" size="sm" /></> : null}
        {budgetTotal == null ? (
          <>
            <p>{t('ledger.setBudget')}</p>
            <input className="field" inputMode="decimal" value={totalDraft} onChange={(event) => setTotalDraft(event.target.value)} />
            <button type="button" className="btn primary" onClick={() => { const value = Number(totalDraft); if (value > 0) { setBudgetTotal(value); setTotalDraft('') } }}>{t('common.save')}</button>
          </>
        ) : (
          <>
            <div className="row-btn static">
              <strong>{formatHKD(budgetTotal)}</strong>
              <button type="button" className="text-btn" onClick={() => setBudgetTotal(null)}>{t('ledger.clearBudget')}</button>
            </div>
            <div className={over ? 'bar over' : 'bar'}><span style={{ width: `${Math.min(100, (totals.expense / budgetTotal) * 100)}%` }} /></div>
            <p>{over ? t('ledger.over', { amount: formatHKD(totals.expense - budgetTotal) }) : `${t('ledger.spent', { amount: formatHKD(totals.expense) })} · ${t('ledger.left', { amount: formatHKD(Math.max(0, budgetTotal - totals.expense)) })}`}</p>
          </>
        )}
      </article>
      <div className="card">
        {expenseCats.map((item) => {
          const budget = budgetByCategory[item.id]
          const spent = spentOf(item.id)
          const itemOver = budget != null && spent > budget
          return (
            <button key={item.id} type="button" className={itemOver ? 'budget-line over' : 'budget-line'} onClick={() => { setEditing(item.id); setAmount(budget != null ? String(budget) : '') }}>
              <CategoryIcon id={item.id} emoji={item.icon} size={28} />
              <span>
                <strong>{displayName(item, t)}</strong>
                {budget != null ? <em>{itemOver ? t('ledger.over', { amount: formatHKD(spent - budget) }) : `${t('ledger.spent', { amount: formatHKD(spent) })} · ${t('ledger.left', { amount: formatHKD(budget - spent) })}`}</em> : <em>{t('common.unset')}</em>}
                {budget != null ? <div className={itemOver ? 'bar over' : 'bar'}><span style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} /></div> : null}
              </span>
              <b>{budget != null ? formatHKD(budget) : t('common.unset')}</b>
            </button>
          )
        })}
      </div>
      <BottomSheet open={!!editing} onClose={() => setEditing(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('nav.budget')} onClose={() => setEditing(null)} closeLabel={t('common.close')} />
        <div className="sheet-body stack">
          <input className="field" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          <button type="button" className="btn primary" onClick={() => { if (!editing) return; const value = Number(amount); if (value > 0) setCategoryBudget(editing, value); setEditing(null) }}>{t('common.save')}</button>
          <button type="button" className="btn ghost" onClick={() => { if (editing) setCategoryBudget(editing, null); setEditing(null) }}>{t('common.clear')}</button>
        </div>
      </BottomSheet>
    </div>
  )
}
