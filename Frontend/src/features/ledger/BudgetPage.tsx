import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from '../../components/Calendar.tsx'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { Icon } from '../../components/Icon.tsx'
import { Dialog } from '../../components/Overlay.tsx'
import { budgetRange, currentMonthBounds, eachDate, formatMonthDay, parseISODate } from '../../lib/date.ts'
import { categoryTotals, totalsBetween } from '../../lib/finance.ts'
import { displayName } from '../../lib/label.ts'
import { roundMoney } from '../../lib/money.ts'
import { useStore } from '../../store/useStore.ts'
import { budgetPose, budgetSrc } from './budgetArt.ts'

function moneyDigits(amount: number): string {
  const rounded = roundMoney(amount)
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const text = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2).replace(/0$/, '')
  const [whole, fraction] = text.split('.')
  const grouped = (whole ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${grouped}${fraction ? `.${fraction}` : ''}`
}

function budgetPair(spent: number, total: number): string {
  return `HKD$ ${moneyDigits(spent)}/${moneyDigits(total)}`
}

function parseAmount(text: string): number | null {
  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0) return null
  return roundMoney(value)
}

export function BudgetPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const categories = useStore((state) => state.categories)
  const transactions = useStore((state) => state.transactions)
  const budgetTotal = useStore((state) => state.budgetTotal)
  const budgetStart = useStore((state) => state.budgetStart)
  const budgetEnd = useStore((state) => state.budgetEnd)
  const budgetByCategory = useStore((state) => state.budgetByCategory)
  const setBudget = useStore((state) => state.setBudget)
  const clearBudget = useStore((state) => state.clearBudget)
  const setCategoryBudget = useStore((state) => state.setCategoryBudget)

  const month = currentMonthBounds()
  const range = budgetRange(budgetStart, budgetEnd)
  const spent = budgetTotal == null ? 0 : totalsBetween(transactions, range.start, range.end).expense
  const ratio = budgetTotal != null && budgetTotal > 0 ? spent / budgetTotal : 0
  const face = budgetSrc(budgetPose(budgetTotal == null ? 0 : ratio))
  const ciallo = budgetSrc('ciallo')
  const byCat = categoryTotals(transactions, range.start, range.end, 'expense')
  const spentOf = (id: string) => byCat.find((item) => item.id === id)?.amount ?? 0
  const expenseCats = categories.filter((item) => item.kind === 'expense')
  const splits = expenseCats.filter((item) => budgetByCategory[item.id] != null)
  const categorySum = (exceptId?: string) =>
    roundMoney(
      Object.entries(budgetByCategory).reduce((sum, [id, amount]) => (id === exceptId ? sum : sum + amount), 0),
    )

  const [totalOpen, setTotalOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [start, setStart] = useState(month.start)
  const [end, setEnd] = useState(month.end)
  const [picking, setPicking] = useState<'start' | 'end'>('start')
  const [cursor, setCursor] = useState(() => new Date())
  const [totalError, setTotalError] = useState('')
  const [askDelete, setAskDelete] = useState(false)

  const [splitId, setSplitId] = useState<string | null>(null)
  const [splitNew, setSplitNew] = useState(false)
  const [splitAmount, setSplitAmount] = useState('')
  const [splitError, setSplitError] = useState('')
  const [needTotal, setNeedTotal] = useState(false)
  const [askDeleteSplit, setAskDeleteSplit] = useState(false)

  const isThisMonth = start === month.start && end === month.end
  const totalValue = parseAmount(amount)
  const orderedStart = start <= end ? start : end
  const orderedEnd = start <= end ? end : start

  function openCreate() {
    const bounds = currentMonthBounds()
    setAmount('')
    setStart(bounds.start)
    setEnd(bounds.end)
    setPicking('start')
    setCursor(new Date())
    setTotalError('')
    setTotalOpen(true)
  }

  function openEdit() {
    const bounds = budgetRange(budgetStart, budgetEnd)
    setAmount(budgetTotal == null ? '' : String(budgetTotal))
    setStart(bounds.start)
    setEnd(bounds.end)
    setPicking('start')
    setCursor(parseISODate(bounds.start))
    setTotalError('')
    setTotalOpen(true)
  }

  function applyThisMonth() {
    const bounds = currentMonthBounds()
    setStart(bounds.start)
    setEnd(bounds.end)
    setCursor(new Date())
    setPicking('start')
  }

  function saveTotal() {
    if (totalValue == null) return
    if (categorySum() > totalValue) {
      setTotalError(t('ledger.splitOver'))
      return
    }
    setBudget(totalValue, orderedStart, orderedEnd)
    setTotalOpen(false)
  }

  function openAdd() {
    if (budgetTotal == null) {
      setNeedTotal(true)
      return
    }
    setSplitId(null)
    setSplitAmount('')
    setSplitError('')
    setSplitNew(true)
  }

  function openSplit(id: string) {
    setSplitNew(false)
    setSplitId(id)
    setSplitAmount(String(budgetByCategory[id] ?? ''))
    setSplitError('')
  }

  function saveSplit() {
    const value = parseAmount(splitAmount)
    if (!splitId || value == null || budgetTotal == null) return
    if (categorySum(splitId) + value > budgetTotal) {
      setSplitError(t('ledger.splitOver'))
      return
    }
    setCategoryBudget(splitId, value)
    setSplitNew(false)
    setSplitId(null)
  }

  const available = expenseCats.filter((item) => budgetByCategory[item.id] == null)
  const editingCat = expenseCats.find((item) => item.id === splitId)

  return (
    <div className="page">
      <div className="page-head">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate('/ledger')}>
          <Icon name="back" />
        </button>
        <strong className="head-title">{t('nav.budget')}</strong>
        <span className="icon-spacer" />
      </div>

      <article className="budget-hero">
        {face ? <img className="budget-hero-art" src={face} alt="" /> : <span className="budget-hero-art" />}
        <div className="budget-hero-copy">
          {budgetTotal == null ? (
            <>
              <strong className="budget-hero-title">{t('ledger.unsetBudgetTitle')}</strong>
              <p className="budget-hero-hint">{t('ledger.unsetBudgetHint')}</p>
              <button type="button" className="budget-hero-btn" onClick={openCreate}>{t('ledger.makeBudget')}</button>
            </>
          ) : (
            <>
              <strong className="budget-hero-title">{budgetPair(spent, budgetTotal)}</strong>
              <div className="budget-hero-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
              </div>
              <button type="button" className="budget-hero-btn" onClick={openEdit}>{t('ledger.editBudget')}</button>
            </>
          )}
        </div>
      </article>

      <article className="card budget-splits">
        {splits.length === 0 ? (
          <div className="budget-splits-empty">
            {ciallo ? <img src={ciallo} alt="" /> : null}
            <strong>{t('ledger.splitTitle')}</strong>
          </div>
        ) : (
          splits.map((item) => {
            const budget = budgetByCategory[item.id] ?? 0
            const used = spentOf(item.id)
            const pct = budget > 0 ? Math.round((used / budget) * 100) : 0
            return (
              <div key={item.id} className="budget-split">
                <CategoryIcon id={item.id} emoji={item.icon} size={44} />
                <span className="budget-split-mid">
                  <strong>{displayName(item, t)}</strong>
                  <span className="budget-split-track">
                    <span className="budget-split-bar">
                      <i style={{ width: `${Math.min(100, pct)}%` }} />
                      <em>{budgetPair(used, budget)}</em>
                    </span>
                    <b>{pct}%</b>
                  </span>
                </span>
                <i className="budget-split-rule" />
                <button type="button" className="icon-btn" aria-label={t('ledger.editSplit')} onClick={() => openSplit(item.id)}>
                  <Icon name="gear" />
                </button>
              </div>
            )
          })
        )}
        <button type="button" className="budget-plus" aria-label={t('ledger.addSplit')} onClick={openAdd}>
          <Icon name="plus" />
        </button>
      </article>

      <Dialog
        open={totalOpen}
        className={budgetTotal != null ? 'budget-form with-trash' : 'budget-form'}
        title={budgetTotal == null ? t('ledger.makeBudget') : t('ledger.editBudget')}
        onClose={() => setTotalOpen(false)}
        closeLabel={t('common.close')}
      >
        {budgetTotal != null ? (
          <button type="button" className="icon-btn budget-trash" aria-label={t('common.delete')} onClick={() => setAskDelete(true)}>
            <Icon name="trash" />
          </button>
        ) : null}
        <div className="budget-form-body">
          <label className="budget-label">{t('common.amount')}</label>
          <input className="field" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); setTotalError('') }} />
          <span className="budget-label">{t('ledger.budgetPeriod')}</span>
          <button type="button" className={isThisMonth ? 'chip on' : 'chip'} onClick={applyThisMonth}>{t('ledger.thisMonth')}</button>
          <div className="budget-dates">
            <button type="button" className={picking === 'start' ? 'on' : ''} onClick={() => { setPicking('start'); setCursor(parseISODate(start)) }}>
              <small>{t('ledger.start')}</small>
              <b>{formatMonthDay(parseISODate(start), i18n.language)}</b>
            </button>
            <button type="button" className={picking === 'end' ? 'on' : ''} onClick={() => { setPicking('end'); setCursor(parseISODate(end)) }}>
              <small>{t('ledger.end')}</small>
              <b>{formatMonthDay(parseISODate(end), i18n.language)}</b>
            </button>
          </div>
          <Calendar
            cursor={cursor}
            onCursor={setCursor}
            selected={picking === 'start' ? start : end}
            highlight={new Set(eachDate(orderedStart, orderedEnd))}
            onSelect={(iso) => {
              if (picking === 'start') setStart(iso)
              else setEnd(iso)
            }}
          />
          {totalError ? <p className="budget-warn">{totalError}</p> : null}
          <button type="button" className="btn primary block" disabled={totalValue == null} onClick={saveTotal}>{t('common.save')}</button>
        </div>
      </Dialog>

      <Dialog open={askDelete} title={t('common.delete')} body={t('ledger.deleteBudgetAsk')} onClose={() => setAskDelete(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setAskDelete(false)}>{t('common.cancel')}</button>
          <button type="button" className="btn danger" onClick={() => { clearBudget(); setAskDelete(false); setTotalOpen(false) }}>{t('common.delete')}</button>
        </div>
      </Dialog>

      <Dialog open={needTotal} title={t('ledger.makeBudget')} body={t('ledger.splitNeedTotal')} onClose={() => setNeedTotal(false)} closeLabel={t('common.close')}>
        <button type="button" className="btn primary block" onClick={() => { setNeedTotal(false); openCreate() }}>{t('ledger.makeBudget')}</button>
      </Dialog>

      <Dialog
        open={splitNew || !!splitId}
        className={splitNew ? 'budget-form' : 'budget-form with-trash'}
        title={splitNew ? t('ledger.addSplit') : t('ledger.editSplit')}
        onClose={() => { setSplitNew(false); setSplitId(null) }}
        closeLabel={t('common.close')}
      >
        {splitNew ? null : (
          <button type="button" className="icon-btn budget-trash" aria-label={t('common.delete')} onClick={() => setAskDeleteSplit(true)}>
            <Icon name="trash" />
          </button>
        )}
        <div className="budget-form-body">
          {splitNew ? (
            available.length ? (
              <div className="budget-cats">
                {available.map((item) => (
                  <button key={item.id} type="button" className={splitId === item.id ? 'asset-card on' : 'asset-card'} onClick={() => setSplitId(item.id)}>
                    <CategoryIcon id={item.id} emoji={item.icon} />
                    <span className="asset-name">{displayName(item, t)}</span>
                  </button>
                ))}
              </div>
            ) : <p className="budget-warn">{t('ledger.splitAll')}</p>
          ) : editingCat ? (
            <div className="budget-split-name">
              <CategoryIcon id={editingCat.id} emoji={editingCat.icon} />
              <strong>{displayName(editingCat, t)}</strong>
            </div>
          ) : null}
          <label className="budget-label">{t('common.amount')}</label>
          <input className="field" inputMode="decimal" value={splitAmount} onChange={(event) => { setSplitAmount(event.target.value); setSplitError('') }} />
          {splitError ? <p className="budget-warn">{splitError}</p> : null}
          <button type="button" className="btn primary block" disabled={parseAmount(splitAmount) == null || !splitId} onClick={saveSplit}>{t('common.save')}</button>
        </div>
      </Dialog>

      <Dialog open={askDeleteSplit} title={t('common.delete')} body={t('ledger.deleteSplitAsk')} onClose={() => setAskDeleteSplit(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setAskDeleteSplit(false)}>{t('common.cancel')}</button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (splitId) setCategoryBudget(splitId, null)
              setAskDeleteSplit(false)
              setSplitId(null)
              setSplitNew(false)
            }}
          >
            {t('common.delete')}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
