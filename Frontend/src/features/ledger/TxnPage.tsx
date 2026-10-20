import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Account, AccountType, Transaction } from '../../domain/types.ts'
import { amountDisplay, amountFromNumber, backspaceAmount, currentAmount, emptyAmount, equalsAmount, pushDigit, pushOp, type Op } from '../../lib/amount.ts'
import { Calendar } from '../../components/Calendar.tsx'
import { CategorySheet } from '../../components/CategorySheet.tsx'
import { Icon } from '../../components/Icon.tsx'
import { BottomSheet, Dialog, SearchField, SheetHeader, useSheetSlideClose } from '../../components/Overlay.tsx'
import { ACCOUNT_ICON } from '../../domain/icons.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import expenseArt from '../../assets/txn_categories/txn_expense.png'
import incomeArt from '../../assets/txn_categories/txn_income.png'
import transferArt from '../../assets/txn_categories/txn_transaction.png'
import { formatMonthDay, isoDate, parseISODate, todayISO } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { formatPlain, groupAmount } from '../../lib/money.ts'
import { useStore } from '../../store/useStore.ts'

const symbols: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }
const accountOrder: AccountType[] = ['cash', 'bank', 'credit', 'ewallet']
const typeArt = { expense: expenseArt, income: incomeArt, transfer: transferArt } as const
const lastAccountKey = 'pocketnote-last-account'

function readLastAccount(): string | null {
  try {
    return localStorage.getItem(lastAccountKey)
  } catch {
    return null
  }
}

function writeLastAccount(id: string) {
  try {
    localStorage.setItem(lastAccountKey, id)
  } catch {
    /* the picker still keeps the choice for this visit */
  }
}

function preferredAccountId(list: Account[], kind: Transaction['type'], remembered: string | null): string | null {
  const usable = list.filter((item) => kind !== 'income' || item.type !== 'credit')
  if (remembered && usable.some((item) => item.id === remembered)) return remembered
  return usable[0]?.id ?? null
}

export function TxnPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { from?: string; background?: unknown } | null
  const from = routeState?.from ?? '/ledger'
  const transactions = useStore((state) => state.transactions)
  const accounts = useStore((state) => state.accounts)
  const categories = useStore((state) => state.categories)
  const addTransaction = useStore((state) => state.addTransaction)
  const updateTransaction = useStore((state) => state.updateTransaction)
  const deleteTransaction = useStore((state) => state.deleteTransaction)
  const refundTransaction = useStore((state) => state.refundTransaction)
  const mailboxEmail = useStore((state) => state.settings.mailboxEmail)
  const setMailboxEmail = useStore((state) => state.setMailboxEmail)
  const existing = id ? transactions.find((item) => item.id === id) : undefined
  const [type, setType] = useState<Transaction['type']>(existing && existing.type !== 'refund' ? existing.type : existing?.type ?? 'expense')
  const [amount, setAmount] = useState(existing ? amountFromNumber(existing.amount) : emptyAmount)
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? (existing?.type === 'transfer' ? null : categories.find((item) => item.kind === (existing?.type === 'income' ? 'income' : 'expense'))?.id ?? null))
  const [accountId, setAccountId] = useState<string | null>(() => existing?.accountId ?? preferredAccountId(accounts, existing && existing.type !== 'refund' ? existing.type : 'expense', readLastAccount()))
  const initialAccountId = useRef(accountId)
  const [toAccountId, setToAccountId] = useState<string | null>(existing?.toAccountId ?? null)
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirming, setConfirming] = useState(false)
  const [captureNote, setCaptureNote] = useState(false)
  const [sheet, setSheet] = useState<'category' | 'account' | 'date' | 'note' | 'copy' | 'mail' | 'auth' | null>(null)
  const [side, setSide] = useState<'single' | 'from' | 'to'>('single')
  const [error, setError] = useState('')
  const [leave, setLeave] = useState(false)
  const [remove, setRemove] = useState(false)
  const [refundAsk, setRefundAsk] = useState(false)
  const [copyQuery, setCopyQuery] = useState('')
  const [mail, setMail] = useState(mailboxEmail ?? '')
  const [cursor, setCursor] = useState(() => parseISODate(existing?.date ?? todayISO()))
  const cameraRef = useRef<HTMLInputElement>(null)
  const albumRef = useRef<HTMLInputElement>(null)
  const amountRowRef = useRef<HTMLDivElement>(null)
  const account = accounts.find((item) => item.id === accountId)
  const other = accounts.find((item) => item.id === toAccountId)
  const accountChoices = accounts.filter((item) => type !== 'income' || item.type !== 'credit')
  const initialCategoryId = useRef(categoryId)
  const dirty = amount.entry !== '' || amount.acc != null || categoryId !== initialCategoryId.current || accountId !== initialAccountId.current || !!toAccountId || note.trim() !== ''
  const title = confirming ? t('ledger.confirmTxn') : existing ? t('ledger.editTxn') : t('ledger.newTxn')

  function reset() {
    setType('expense')
    setAmount(emptyAmount)
    setDate(todayISO())
    setCategoryId(null)
    setAccountId(initialAccountId.current)
    setToAccountId(null)
    setNote('')
    setConfirming(false)
    setCaptureNote(false)
    setError('')
  }

  function exit() {
    if (routeState?.background) navigate(-1)
    else navigate(from, { replace: true })
  }

  function close() {
    if (!existing && dirty) setLeave(true)
    else exit()
  }

  function dismissOverlay() {
    if (sheet) {
      setSheet(null)
      return
    }
    if (leave || remove || refundAsk) {
      setLeave(false)
      setRemove(false)
      setRefundAsk(false)
      return
    }
    close()
  }

  function save() {
    const value = currentAmount(amount)
    const missing: string[] = []
    if (!(value != null && value > 0)) missing.push(t('common.amount'))
    if (!date) missing.push(t('common.date'))
    if ((type === 'expense' || type === 'income') && !categoryId) missing.push(t('common.category'))
    if (type !== 'transfer' && !accountId) missing.push(t('common.account'))
    if (type === 'income' && account?.type === 'credit') {
      setError(t('ledger.creditIncome'))
      return
    }
    if (type === 'transfer') {
      if (!accountId) missing.push(t('ledger.from'))
      if (!toAccountId) missing.push(t('ledger.to'))
      if (accountId && accountId === toAccountId) {
        setError(t('ledger.sameAccount'))
        return
      }
    }
    if (missing.length || value == null) {
      setError(t('ledger.missing', { fields: missing.join(t('common.listSep')) }))
      return
    }
    const draft = { type, amount: value, date, categoryId: type === 'transfer' ? null : categoryId, accountId, toAccountId: type === 'transfer' ? toAccountId : null, note }
    if (existing) updateTransaction(existing.id, draft)
    else addTransaction(draft)
    exit()
  }

  function applyCopy(tx: Transaction) {
    setType(tx.type === 'refund' ? 'expense' : tx.type)
    setAmount(amountFromNumber(tx.amount))
    setDate(todayISO())
    setCategoryId(tx.categoryId)
    setAccountId(tx.accountId)
    setToAccountId(tx.toAccountId)
    setNote(tx.note)
    setSheet(null)
  }

  const opHint = amount.op && amount.acc != null ? `${groupAmount(formatPlain(amount.acc))} ${symbols[amount.op]}` : ''
  const shownAmount = amountDisplay(amount)
  useLayoutEffect(() => {
    const row = amountRowRef.current
    if (!row) return
    const ccy = row.querySelector<HTMLElement>('.txn-ccy')
    const figure = row.querySelector<HTMLElement>('.amount-lg')
    if (!ccy || !figure) return
    let lastWidth = -1
    const fit = () => {
      const available = row.clientWidth
      if (Math.abs(available - lastWidth) < 1) return
      lastWidth = available
      ccy.style.fontSize = '22px'
      figure.style.fontSize = '40px'
      const needed = row.scrollWidth
      if (available > 0 && needed > available + 1) {
        const scale = available / needed
        ccy.style.fontSize = `${Math.max(14, 22 * scale)}px`
        figure.style.fontSize = `${Math.max(18, 40 * scale)}px`
      }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(row)
    return () => observer.disconnect()
  }, [shownAmount, type])
  const kindCategories = categories.filter((item) => item.kind === (type === 'income' ? 'income' : 'expense'))
  const selectedCategory = kindCategories.find((item) => item.id === categoryId) ?? kindCategories[0]

  return (
    <BottomSheet open onClose={dismissOverlay} closeLabel={t('common.close')} dragHandle onDragClose={() => {
      if (!existing && dirty) {
        setLeave(true)
        return false
      }
      return true
    }}>
      <div className="txn-sheet-head">
        <TxnSheetHeader
          title={title}
          fallback={close}
          closeLabel={t('common.close')}
          right={existing ? (
            <button type="button" className="text-btn" onClick={() => setRemove(true)}>{t('common.delete')}</button>
          ) : confirming ? (
            <button type="button" className="text-btn" onClick={reset}>{t('common.abandon')}</button>
          ) : (
            <button type="button" className="text-btn" onClick={() => setSheet('copy')}>{t('common.copy')}</button>
          )}
        />
      </div>
      <div className="txn-sheet">
      {type === 'refund' ? <p className="center-note">{t('ledger.refund')}</p> : (
        <div className="seg txn-types">
          {(['expense', 'income', 'transfer'] as const).map((item) => (
            <button key={item} type="button" className={type === item ? 'on' : ''} onClick={() => {
              setType(item)
              if (item === 'income' && account?.type === 'credit') setAccountId(accounts.find((entry) => entry.type !== 'credit')?.id ?? null)
              if (item !== 'transfer') {
                const nextKind = item === 'income' ? 'income' : 'expense'
                const picked = categories.find((entry) => entry.id === categoryId)
                if (!picked || picked.kind !== nextKind) setCategoryId(categories.find((entry) => entry.kind === nextKind)?.id ?? null)
              }
            }}><img src={typeArt[item]} alt="" /><span>{t(`ledger.${item}`)}</span></button>
          ))}
        </div>
      )}
      <div className="txn-scroll">
      {type === 'transfer' ? (
        <>
          <button type="button" className="row-btn" onClick={() => { setSide('from'); setSheet('account') }}><span>{t('ledger.from')}</span><em>{account ? displayName(account, t) : t('ledger.chooseAccount')} ›</em></button>
          <button type="button" className="row-btn" onClick={() => { setSide('to'); setSheet('account') }}><span>{t('ledger.to')}</span><em>{other ? displayName(other, t) : t('ledger.chooseAccount')} ›</em></button>
        </>
      ) : (
        <>
        <div className="txn-cat-head">
          <span>{t('common.category')}</span>
          <strong>{selectedCategory ? displayName(selectedCategory, t) : ''}</strong>
        </div>
        <div className="grid-3 txn-cats">
          {kindCategories.map((item) => (
            <button key={item.id} type="button" className={categoryId === item.id ? 'mini-card cat-card on' : 'mini-card cat-card'} onClick={() => setCategoryId(item.id)}>
              <CategoryIcon id={item.id} emoji={item.icon} size={44} />
              <span>{displayName(item, t)}</span>
            </button>
          ))}
          <button type="button" className="mini-card cat-card" onClick={() => setSheet('category')}>
            <span className="cat-ico">+</span>
            <span>{t('common.add')}</span>
          </button>
        </div>
        </>
      )}
      {captureNote ? <p className="muted">{t('ledger.captureFail')}</p> : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {type !== 'refund' ? (
        <div className="capture">
          <button type="button" onClick={() => cameraRef.current?.click()}><Icon name="camera" /><span>{t('ledger.photo')}</span></button>
          <button type="button" onClick={() => albumRef.current?.click()}><Icon name="image" /><span>{t('ledger.album')}</span></button>
          <button type="button" onClick={() => setSheet(mailboxEmail ? 'mail' : 'auth')}><Icon name="mail" /><span>{t('ledger.mail')}</span></button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={() => { setConfirming(true); setCaptureNote(true) }} />
          <input ref={albumRef} type="file" accept="image/*" hidden onChange={() => { setConfirming(true); setCaptureNote(true) }} />
        </div>
      ) : null}
      <div className="kpad txn-kpad">
        <div className={existing && existing.type !== 'transfer' && existing.type !== 'refund' ? 'kpad-above has-refund' : 'kpad-above'}>
          <div className={`txn-amount${type === 'expense' || type === 'income' ? ` ${type}` : ''}`}>
            <span className="txn-amount-label">
              <span>{t('common.amount')}</span>
              {opHint ? <span className="op-hint">{opHint}</span> : null}
            </span>
            <div className="txn-amount-row" ref={amountRowRef}>
              <span className="txn-ccy">HK$</span>
              <span className="amount-lg">{shownAmount}</span>
            </div>
            {note ? <p className="note-preview">{note}</p> : null}
          </div>
          {existing && existing.type !== 'transfer' && existing.type !== 'refund' ? (
            <button type="button" className="key refund-key" disabled={existing.refunded} onClick={() => setRefundAsk(true)}>{existing.refunded ? t('ledger.refunded') : t('ledger.refund')}</button>
          ) : null}
          <button type="button" className="key account-key" onClick={() => { setSide(type === 'transfer' ? (accountId && toAccountId ? 'from' : accountId ? 'to' : 'from') : 'single'); setSheet('account') }}>
            {account ? <CategoryIcon id={`acc.${account.type}`} emoji={ACCOUNT_ICON[account.type]} size={28} /> : null}
            <span>{account ? displayName(account, t) : t('common.account')}</span>
          </button>
        </div>
        <div className="txn-board">
          {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '.', '0', '=', '+'].map((key, index) => (
            <button key={key} type="button" className="key" style={{ gridColumn: (index % 4) + 1, gridRow: Math.floor(index / 4) + 1 }} onClick={() => setAmount((current) => (key === '=' ? equalsAmount(current) : '0123456789.'.includes(key) ? pushDigit(current, key) : pushOp(current, key as Op)))}>
              {key === '/' ? '÷' : key === '*' ? '×' : key === '-' ? '−' : key}
            </button>
          ))}
          <button type="button" className="key" style={{ gridColumn: 5, gridRow: 1 }} onClick={() => setSheet('date')}>{t('common.date')}</button>
          <button type="button" className="key" style={{ gridColumn: 5, gridRow: 2 }} onClick={() => setSheet('note')}>{t('common.note')}</button>
          <button type="button" className="key" style={{ gridColumn: 5, gridRow: 3 }} onClick={() => setAmount((current) => backspaceAmount(current))} aria-label={t('common.clear')}><Icon name="backspace" /></button>
          <button type="button" className="key save" style={{ gridColumn: 5, gridRow: 4 }} onClick={save}>{t('common.save')}</button>
        </div>
      </div>
      </div>
      <CategorySheet createOnly open={sheet === 'category'} kind={type === 'income' ? 'income' : 'expense'} onClose={() => setSheet(null)} onPick={(next) => { setCategoryId(next); setSheet(null) }} />
      <Dialog open={sheet === 'account'} title={t('ledger.chooseAccount')} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <div className="account-picker">
          {accountOrder.map((kind) => {
            const group = accountChoices.filter((item) => item.type === kind)
            if (!group.length) return null
            const pickedId = side === 'to' ? toAccountId : accountId
            return (
              <div key={kind} className="account-group">
                {group.map((item) => (
                  <button key={item.id} type="button" className={pickedId === item.id ? 'asset-card on' : 'asset-card'} onClick={() => {
                    if (side === 'to') setToAccountId(item.id)
                    else {
                      setAccountId(item.id)
                      writeLastAccount(item.id)
                    }
                    setSheet(null)
                  }}>
                    <CategoryIcon id={`acc.${item.type}`} emoji={ACCOUNT_ICON[item.type]} size={40} />
                    <span className="asset-name">{displayName(item, t)}</span>
                    {pickedId === item.id ? <Icon name="check" size={18} /> : null}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </Dialog>
      <BottomSheet open={sheet === 'date'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={formatMonthDay(parseISODate(date), i18n.language)} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <div className="sheet-body">
          <Calendar cursor={cursor} onCursor={setCursor} selected={date} onSelect={(iso) => { setDate(iso); setSheet(null) }} />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'note'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('common.note')} onClose={() => setSheet(null)} closeLabel={t('common.close')} right={<button type="button" className="text-btn" onClick={() => setSheet(null)}>{t('common.done')}</button>} />
        <div className="sheet-body"><textarea className="textarea" value={note} placeholder={t('common.note')} onChange={(event) => setNote(event.target.value)} /></div>
      </BottomSheet>
      <BottomSheet open={sheet === 'copy'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('ledger.searchOld')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <div className="sheet-body stack">
          <SearchField value={copyQuery} onChange={setCopyQuery} placeholder={t('common.search')} />
          {transactions.filter((tx) => {
            const cat = categories.find((item) => item.id === tx.categoryId)
            const acc = accounts.find((item) => item.id === tx.accountId)
            const hay = `${tx.note} ${cat ? displayName(cat, t) : ''} ${acc ? displayName(acc, t) : ''}`.toLowerCase()
            return hay.includes(copyQuery.trim().toLowerCase())
          }).map((tx) => <button key={tx.id} type="button" className="row-btn" onClick={() => applyCopy(tx)}><span>{tx.note || (categories.find((item) => item.id === tx.categoryId) ? displayName(categories.find((item) => item.id === tx.categoryId)!, t) : t(`ledger.${tx.type}`))}</span><em>{isoDate(parseISODate(tx.date))}</em></button>)}
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'mail'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('ledger.mail')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <div className="sheet-body stack">
          <p className="muted">{t('ledger.mailEmpty')}</p>
          <button type="button" className="btn ghost" onClick={() => { setMailboxEmail(null); setSheet(null) }}>{t('ledger.cancelAuth')}</button>
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'auth'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('ledger.authTitle')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <form className="sheet-body stack" onSubmit={(event) => { event.preventDefault(); if (!mail.includes('@')) return; setMailboxEmail(mail.trim()); setSheet('mail') }}>
          <input className="field" type="email" value={mail} placeholder={t('ledger.email')} onChange={(event) => setMail(event.target.value)} />
          <button type="submit" className="btn primary">{t('ledger.signIn')}</button>
        </form>
      </BottomSheet>
      <Dialog open={leave} title={t('ledger.abandonAsk')} onClose={() => setLeave(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setLeave(false)}>{t('common.cancel')}</button>
          <button type="button" className="btn danger" onClick={exit}>{t('common.abandon')}</button>
        </div>
      </Dialog>
      <Dialog open={remove} title={t('common.delete')} body={t('ledger.deleteAsk')} onClose={() => setRemove(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setRemove(false)}>{t('common.cancel')}</button>
          <button type="button" className="btn danger" onClick={() => { if (existing) deleteTransaction(existing.id); exit() }}>{t('common.delete')}</button>
        </div>
      </Dialog>
      <Dialog open={refundAsk} title={t('ledger.refund')} body={t('ledger.refundAsk')} onClose={() => setRefundAsk(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setRefundAsk(false)}>{t('common.cancel')}</button>
          <button type="button" className="btn primary" onClick={() => { if (existing) refundTransaction(existing.id); setRefundAsk(false); exit() }}>{t('common.confirm')}</button>
        </div>
      </Dialog>
    </BottomSheet>
  )
}

function TxnSheetHeader({ title, closeLabel, right, fallback }: { title: string; closeLabel: string; right?: ReactNode; fallback: () => void }) {
  const slideClose = useSheetSlideClose()
  return <SheetHeader title={title} closeLabel={closeLabel} right={right} onClose={() => { if (slideClose) slideClose(); else fallback() }} />
}
