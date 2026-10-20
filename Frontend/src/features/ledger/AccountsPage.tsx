import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Account, AccountType, FixedExpense } from '../../domain/types.ts'
import { ACCOUNT_ICON } from '../../domain/icons.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { CategorySheet } from '../../components/CategorySheet.tsx'
import { MenuButton } from '../../components/Icon.tsx'
import { BottomSheet, SheetHeader } from '../../components/Overlay.tsx'
import { Wheel } from '../../components/Wheel.tsx'
import { Switch } from '../../components/Icon.tsx'
import { accountBalance, netPosition } from '../../lib/finance.ts'
import { displayName } from '../../lib/label.ts'
import { formatHKD, roundMoney } from '../../lib/money.ts'
import { useFab } from '../../lib/useFab.ts'
import { accountInUse, useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { openTxn } from './shared.tsx'

const types: AccountType[] = ['cash', 'bank', 'credit', 'ewallet']

export function AccountsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setDrawer = useUi((state) => state.setDrawer)
  const accounts = useStore((state) => state.accounts)
  const transactions = useStore((state) => state.transactions)
  const fixedExpenses = useStore((state) => state.fixedExpenses)
  const categories = useStore((state) => state.categories)
  const addAccount = useStore((state) => state.addAccount)
  const updateAccount = useStore((state) => state.updateAccount)
  const deleteAccount = useStore((state) => state.deleteAccount)
  const saveFixed = useStore((state) => state.saveFixed)
  const deleteFixed = useStore((state) => state.deleteFixed)
  const [accountDraft, setAccountDraft] = useState<Account | 'new' | null>(null)
  const [fixedDraft, setFixedDraft] = useState<FixedExpense | 'new' | null>(null)
  useFab(true, () => openTxn(navigate, location))
  const position = netPosition(accounts, transactions)
  const assets = accounts.filter((item) => item.type !== 'credit')
  const debts = accounts.filter((item) => item.type === 'credit')

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <strong className="head-title">{t('nav.accounts')}</strong>
        <span className="icon-spacer" />
      </div>
      <article className="card stat hero"><span>{t('ledger.netWorth')}</span><strong>{formatHKD(position.net)}</strong></article>
      <div className="split">
        <article className="card stat"><span>{t('ledger.assets')}</span><strong>{formatHKD(position.assets)}</strong></article>
        <article className="card stat"><span>{t('ledger.liabilities')}</span><strong>{formatHKD(position.liabilities)}</strong></article>
      </div>
      <section className="card">
        <div className="row-btn static"><strong>{t('ledger.assets')}</strong><button type="button" className="text-btn" onClick={() => setAccountDraft('new')}>{t('common.add')}</button></div>
        {assets.map((item) => (
          <AccountLine key={item.id} account={item} amount={accountBalance(item, transactions)} onClick={() => setAccountDraft(item)} />
        ))}
      </section>
      <section className="card">
        <div className="row-btn static"><strong>{t('ledger.liabilities')}</strong><button type="button" className="text-btn" onClick={() => setAccountDraft('new')}>{t('common.add')}</button></div>
        {debts.map((item) => (
          <AccountLine key={item.id} account={item} amount={accountBalance(item, transactions)} debt onClick={() => setAccountDraft(item)} />
        ))}
      </section>
      <section className="card">
        <div className="row-btn static"><strong>{t('ledger.fixed')}</strong><button type="button" className="text-btn" onClick={() => setFixedDraft('new')}>{t('common.add')}</button></div>
        {fixedExpenses.length ? fixedExpenses.map((item) => {
          const category = categories.find((entry) => entry.id === item.categoryId)
          const account = accounts.find((entry) => entry.id === item.accountId)
          return (
            <button key={item.id} type="button" className="budget-line" onClick={() => setFixedDraft(item)}>
              <CategoryIcon id={category?.id ?? item.categoryId} emoji={category?.icon ?? '✨'} />
              <span>
                <strong>{item.name}</strong>
                <em>{category ? displayName(category, t) : ''} · {account ? displayName(account, t) : ''} · {t('todo.monthlyDay', { day: item.dayOfMonth })} · {item.addToTodo ? t('ledger.addedTodo') : t('ledger.notAddedTodo')}</em>
              </span>
              <b>{formatHKD(item.amount)}</b>
            </button>
          )
        }) : <p className="muted">{t('ledger.noneFixed')}</p>}
      </section>
      <AccountSheet
        draft={accountDraft}
        onClose={() => setAccountDraft(null)}
        used={(id) => accountInUse(id, { transactions, fixedExpenses })}
        onSave={(type, name, initial, id) => {
          if (id) updateAccount(id, { name, initialAmount: initial })
          else addAccount(type, name, initial)
        }}
        onDelete={deleteAccount}
      />
      <FixedSheet draft={fixedDraft} onClose={() => setFixedDraft(null)} onSave={saveFixed} onDelete={deleteFixed} />
    </div>
  )
}

function AccountLine({ account, amount, debt = false, onClick }: { account: Account; amount: number; debt?: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" className="budget-line" onClick={onClick}>
      <CategoryIcon id={`acc.${account.type}`} emoji={ACCOUNT_ICON[account.type]} />
      <span><strong>{displayName(account, t)}</strong>{debt ? <em>{t('ledger.debt')}</em> : null}</span>
      <b>{formatHKD(amount)}</b>
    </button>
  )
}

function AccountSheet({
  draft,
  onClose,
  used,
  onSave,
  onDelete,
}: {
  draft: Account | 'new' | null
  onClose: () => void
  used: (id: string) => boolean
  onSave: (type: AccountType, name: string, initial: number, id?: string) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation()
  const existing = draft && draft !== 'new' ? draft : null
  const blocked = existing ? used(existing.id) : false
  const label: Record<AccountType, string> = { cash: t('ledger.typeCash'), bank: t('ledger.typeBank'), credit: t('ledger.typeCredit'), ewallet: t('ledger.typeWallet') }
  return (
    <BottomSheet
      open={!!draft}
      onClose={onClose}
      closeLabel={t('common.close')}
    >
      <SheetHeader title={existing ? t('ledger.editAccount') : t('ledger.newAccount')} onClose={onClose} closeLabel={t('common.close')} />
      {draft ? (
        <AccountForm
          key={existing?.id ?? 'new'}
          type={existing?.type ?? 'cash'}
          lockedType={!!existing}
          name={existing ? displayName(existing, t) : ''}
          initial={existing ? String(existing.initialAmount) : '0'}
          label={label}
          blocked={blocked}
          onSubmit={(nextType, nextName, nextInitial) => {
            onSave(nextType, nextName, nextInitial, existing?.id)
            onClose()
          }}
          onDelete={existing && !blocked ? () => { onDelete(existing.id); onClose() } : undefined}
        />
      ) : null}
    </BottomSheet>
  )
}

function AccountForm({
  type,
  lockedType,
  name,
  initial,
  label,
  blocked,
  onSubmit,
  onDelete,
}: {
  type: AccountType
  lockedType: boolean
  name: string
  initial: string
  label: Record<AccountType, string>
  blocked: boolean
  onSubmit: (type: AccountType, name: string, initial: number) => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [localType, setLocalType] = useState(type)
  const [localName, setLocalName] = useState(name)
  const [localInitial, setLocalInitial] = useState(initial)
  return (
    <div className="sheet-body stack">
      <div className="seg">
        {types.map((item) => (
          <button key={item} type="button" className={localType === item ? 'on' : ''} disabled={lockedType} onClick={() => setLocalType(item)}>{label[item]}</button>
        ))}
      </div>
      <input className="field" value={localName} placeholder={t('common.name')} onChange={(event) => setLocalName(event.target.value)} />
      <label className="stack">
        <span className="muted">{localType === 'credit' ? t('ledger.debt') : t('ledger.initial')}</span>
        <input className="field" inputMode="decimal" value={localInitial} onChange={(event) => setLocalInitial(event.target.value)} />
      </label>
      <button type="button" className="btn primary" disabled={!localName.trim()} onClick={() => onSubmit(localType, localName.trim(), roundMoney(Number(localInitial) || 0))}>{t('common.save')}</button>
      {onDelete ? <button type="button" className="btn danger" onClick={onDelete}>{t('common.delete')}</button> : null}
      {blocked ? <p className="muted">{t('ledger.accountInUse')}</p> : null}
    </div>
  )
}

function FixedSheet({ draft, onClose, onSave, onDelete }: { draft: FixedExpense | 'new' | null; onClose: () => void; onSave: (draft: Omit<FixedExpense, 'id'> & { id?: string }) => void; onDelete: (id: string) => void }) {
  const { t } = useTranslation()
  const existing = draft && draft !== 'new' ? draft : null
  return (
    <BottomSheet open={!!draft} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={t('ledger.fixed')} onClose={onClose} closeLabel={t('common.close')} />
      {draft ? (
        <FixedForm
          key={existing?.id ?? 'new-fixed'}
          existing={existing}
          onDelete={existing ? () => { onDelete(existing.id); onClose() } : undefined}
          onSave={(value) => {
            onSave({ ...value, id: existing?.id })
            onClose()
          }}
        />
      ) : null}
    </BottomSheet>
  )
}

function FixedForm({
  existing,
  onDelete,
  onSave,
}: {
  existing: FixedExpense | null
  onDelete?: () => void
  onSave: (value: { name: string; amount: number; categoryId: string; accountId: string; dayOfMonth: number; addToTodo: boolean }) => void
}) {
  const { t } = useTranslation()
  const accounts = useStore((state) => state.accounts)
  const categories = useStore((state) => state.categories)
  const [name, setName] = useState(existing?.name ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories.find((item) => item.kind === 'expense')?.id ?? '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '')
  const [day, setDay] = useState(String(existing?.dayOfMonth ?? 1))
  const [addToTodo, setAddToTodo] = useState(existing?.addToTodo ?? false)
  const [pickingCategory, setPickingCategory] = useState(false)
  const [error, setError] = useState('')
  const category = categories.find((item) => item.id === categoryId)
  const days = Array.from({ length: 31 }, (_, index) => String(index + 1))
  return (
    <>
      <div className="sheet-body stack">
        <input className="field" value={name} placeholder={t('common.name')} onChange={(event) => setName(event.target.value)} />
        <input className="field" inputMode="decimal" value={amount} placeholder={t('common.amount')} onChange={(event) => setAmount(event.target.value)} />
        <button type="button" className="row-btn" onClick={() => setPickingCategory(true)}>
          <span>{t('common.category')}</span>
          <em>{category ? displayName(category, t) : t('ledger.chooseCategory')}</em>
        </button>
        <label className="stack">
          <span className="muted">{t('common.account')}</span>
          <select className="field" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {accounts.map((item) => <option key={item.id} value={item.id}>{displayName(item, t)}</option>)}
          </select>
        </label>
        <p className="muted">{t('ledger.dayOfMonth')}</p>
        <Wheel values={days} value={day} label={t('ledger.dayOfMonth')} onChange={setDay} />
        <div className="row-btn static">
          <span>{t('ledger.addTodo')}</span>
          <Switch on={addToTodo} label={t('ledger.addTodo')} onClick={() => setAddToTodo(!addToTodo)} />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const nextAmount = roundMoney(Number(amount))
            if (!name.trim() || !(nextAmount > 0) || !categoryId || !accountId) {
              setError(t('ledger.fixedInvalid'))
              return
            }
            onSave({ name: name.trim(), amount: nextAmount, categoryId, accountId, dayOfMonth: Number(day), addToTodo })
          }}
        >
          {t('common.save')}
        </button>
        {onDelete ? <button type="button" className="btn danger" onClick={onDelete}>{t('common.delete')}</button> : null}
      </div>
      <CategorySheet open={pickingCategory} kind="expense" onClose={() => setPickingCategory(false)} onPick={setCategoryId} />
    </>
  )
}
