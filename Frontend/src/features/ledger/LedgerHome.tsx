import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MenuButton } from '../../components/Icon.tsx'
import { EmptyState } from '../../components/Overlay.tsx'
import incomeArt from '../../assets/categories/txn_categories/txn_income.png'
import expenseArt from '../../assets/categories/txn_categories/txn_expense.png'
import { budgetRange } from '../../lib/date.ts'
import { totalsBetween } from '../../lib/finance.ts'
import { formatCardHKD, roundMoney } from '../../lib/money.ts'
import { inPeriod, periodBounds } from '../../lib/period.ts'
import { useFab } from '../../lib/useFab.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { budgetPose, budgetSrc } from './budgetArt.ts'
import { PeriodControls, TxnRow, openTxn, openTxnEdit } from './shared.tsx'

function budgetFigure(amount: number): string {
  const rounded = roundMoney(amount)
  const [whole, fraction] = Math.abs(rounded).toFixed(2).split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const body = fraction === '00' ? grouped : `${grouped}.${fraction}`
  return rounded < 0 ? `-${body}` : body
}

export function LedgerHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setDrawer = useUi((state) => state.setDrawer)
  const transactions = useStore((state) => state.transactions)
  const period = useStore((state) => state.period)
  const budgetTotal = useStore((state) => state.budgetTotal)
  const budgetStart = useStore((state) => state.budgetStart)
  const budgetEnd = useStore((state) => state.budgetEnd)
  useFab(true, () => openTxn(navigate, location))
  const bounds = periodBounds(period)
  const totals = totalsBetween(transactions, bounds.start, bounds.end)
  const budgetWindow = budgetRange(budgetStart, budgetEnd)
  const budgetSpent = budgetTotal == null ? 0 : totalsBetween(transactions, budgetWindow.start, budgetWindow.end).expense
  const latest = transactions
    .filter((item) => inPeriod(item.date, period))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  const ratio = budgetTotal != null && budgetTotal > 0 ? budgetSpent / budgetTotal : 0
  const pose = budgetPose(budgetTotal == null ? 0 : ratio)
  const face = budgetSrc(pose)

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <PeriodControls />
      </div>
      <button type="button" className="card home-budget" onClick={() => navigate('/ledger/budget')}>
        <span className="budget-face">
          <span className="budget-halo" />
          {face ? <img src={face} alt="" /> : null}
        </span>
        <span className="budget-copy">
          <strong>{t('nav.budget')}</strong>
          {budgetTotal != null ? (
            <span className={ratio >= 1 ? 'bar full' : 'bar'}><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></span>
          ) : null}
          {budgetTotal == null ? (
            <span className="budget-figures">{t('ledger.notBudget')}</span>
          ) : (
            <span className="budget-lines">
              <span className="budget-figures">{t('ledger.usage', { spent: budgetFigure(budgetSpent), total: budgetFigure(budgetTotal) })}</span>
              <span className="budget-figures">{t('ledger.remain', { left: budgetFigure(Math.max(0, budgetTotal - budgetSpent)) })}</span>
            </span>
          )}
        </span>
      </button>
      <div className="split">
        <article className="card stat">
          <span>{t('ledger.income')}</span>
          <strong className="stat-amount"><span className="stat-figure">{formatCardHKD(totals.income)}</span><img src={incomeArt} alt="" /></strong>
        </article>
        <article className="card stat">
          <span>{t('ledger.expense')}</span>
          <strong className="stat-amount"><span className="stat-figure">{formatCardHKD(totals.expense)}</span><img src={expenseArt} alt="" /></strong>
        </article>
      </div>
      <div className="section-label">
        <span>{t('ledger.latest')}</span>
        <button type="button" onClick={() => navigate('/ledger/activity')}>{t('ledger.seeAll')}</button>
      </div>
      <article className="card latest-list">
        {latest.length ? latest.map((item) => <TxnRow key={item.id} tx={item} largeIcon onClick={() => openTxnEdit(navigate, item.id, location)} />) : <EmptyState text={t('ledger.empty')} />}
      </article>
    </div>
  )
}
