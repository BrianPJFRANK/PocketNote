import type { Account, AccountType, Transaction } from '../domain/types.ts'
import { roundMoney } from './money.ts'

export function isAsset(type: AccountType): boolean {
  return type !== 'credit'
}

export function accountBalance(account: Account, transactions: Transaction[]): number {
  let amount = account.initialAmount
  for (const tx of transactions) {
    if (tx.type === 'refund' || tx.refunded) continue
    if (tx.type === 'expense' && tx.accountId === account.id) {
      amount += account.type === 'credit' ? tx.amount : -tx.amount
    } else if (tx.type === 'income' && tx.accountId === account.id) {
      amount += tx.amount
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) amount += account.type === 'credit' ? tx.amount : -tx.amount
      if (tx.toAccountId === account.id) amount += account.type === 'credit' ? -tx.amount : tx.amount
    }
  }
  return roundMoney(amount)
}

export function netPosition(accounts: Account[], transactions: Transaction[]): { assets: number; liabilities: number; net: number } {
  let assets = 0
  let liabilities = 0
  for (const account of accounts) {
    const balance = accountBalance(account, transactions)
    if (account.type === 'credit') liabilities += balance
    else assets += balance
  }
  return { assets: roundMoney(assets), liabilities: roundMoney(liabilities), net: roundMoney(assets - liabilities) }
}

export interface Totals {
  income: number
  expense: number
  balance: number
}

export function totalsBetween(transactions: Transaction[], start: string, end: string, accept: (tx: Transaction) => boolean = () => true): Totals {
  let income = 0
  let expense = 0
  for (const tx of transactions) {
    if (tx.date < start || tx.date > end) continue
    if (tx.type === 'refund' || tx.refunded || tx.type === 'transfer') continue
    if (!accept(tx)) continue
    if (tx.type === 'income') income += tx.amount
    if (tx.type === 'expense') expense += tx.amount
  }
  return { income: roundMoney(income), expense: roundMoney(expense), balance: roundMoney(income - expense) }
}

export function categoryTotals(
  transactions: Transaction[],
  start: string,
  end: string,
  type: 'expense' | 'income',
  categoryIds: string[] = [],
  accountIds: string[] = [],
): { id: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const tx of transactions) {
    if (tx.type !== type || tx.refunded || !tx.categoryId) continue
    if (tx.date < start || tx.date > end) continue
    if (categoryIds.length && !categoryIds.includes(tx.categoryId)) continue
    if (accountIds.length && (!tx.accountId || !accountIds.includes(tx.accountId))) continue
    map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount)
  }
  return [...map.entries()]
    .map(([id, amount]) => ({ id, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount)
}

export interface LedgerFilter {
  type: 'all' | 'expense' | 'income' | 'transfer'
  accountIds: string[]
  categoryIds: string[]
  query: string
}

export function transactionVisible(
  tx: Transaction,
  transactions: Transaction[],
  filter: LedgerFilter,
  start: string,
  end: string,
  names: { category: string; account: string; otherAccount: string },
): boolean {
  if (tx.date < start || tx.date > end) return false
  const origin = tx.refundOfId ? transactions.find((item) => item.id === tx.refundOfId) : undefined
  const effective = tx.type === 'refund' ? (origin?.type === 'income' ? 'income' : 'expense') : tx.type
  if (filter.type === 'transfer') {
    if (tx.type !== 'transfer') return false
  } else if (filter.type !== 'all' && effective !== filter.type) {
    return false
  }
  if (filter.accountIds.length) {
    const ids = [tx.accountId, tx.toAccountId].filter((id): id is string => Boolean(id))
    if (!ids.some((id) => filter.accountIds.includes(id))) return false
  }
  if (filter.categoryIds.length) {
    if (!tx.categoryId || !filter.categoryIds.includes(tx.categoryId)) return false
  }
  const query = filter.query.trim().toLowerCase()
  if (!query) return true
  const haystack = `${tx.note} ${names.category} ${names.account} ${names.otherAccount}`.toLowerCase()
  return haystack.includes(query)
}

export function monthAmount(transactions: Transaction[], month: string, type: 'expense' | 'income'): number {
  const [year, mon] = month.split('-').map(Number)
  const start = `${month}-01`
  const endDate = new Date(year, mon, 0)
  const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
  return totalsBetween(transactions, start, end)[type]
}
