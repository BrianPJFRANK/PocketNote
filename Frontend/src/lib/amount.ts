import { formatPlain, groupAmount, roundMoney } from './money.ts'

export type Op = '+' | '-' | '*' | '/'

export interface AmountState {
  acc: number | null
  op: Op | null
  entry: string
}

export const emptyAmount: AmountState = { acc: null, op: null, entry: '' }

export function amountFromNumber(value: number): AmountState {
  return { acc: null, op: null, entry: formatPlain(value) }
}

function apply(left: number, op: Op, right: number): number | null {
  if (op === '/' && right === 0) return null
  const raw = op === '+' ? left + right : op === '-' ? left - right : op === '*' ? left * right : left / right
  if (!Number.isFinite(raw)) return null
  return roundMoney(raw)
}

export function currentAmount(state: AmountState): number | null {
  if (state.op && state.entry) {
    const right = Number(state.entry)
    if (state.acc == null || Number.isNaN(right)) return null
    return apply(state.acc, state.op, right)
  }
  if (state.entry) {
    const value = Number(state.entry)
    return Number.isNaN(value) ? null : roundMoney(value)
  }
  return state.acc == null ? null : roundMoney(state.acc)
}

export function amountText(state: AmountState): string {
  if (state.entry) return state.entry
  if (state.acc != null) return formatPlain(state.acc)
  return '0'
}

export function amountDisplay(state: AmountState): string {
  return groupAmount(amountText(state))
}

export function pushDigit(state: AmountState, digit: string): AmountState {
  if (digit === '.') {
    if (state.entry.includes('.')) return state
    return { ...state, entry: state.entry ? `${state.entry}.` : '0.' }
  }
  const entry = state.entry === '0' ? digit : `${state.entry}${digit}`
  const decimals = entry.split('.')[1] ?? ''
  if (decimals.length > 2) return state
  if (entry.replace('.', '').length > 9) return state
  return { ...state, entry }
}

export function pushOp(state: AmountState, op: Op): AmountState {
  const current = currentAmount(state)
  if (current == null) return { ...state, op }
  return { acc: current, op, entry: '' }
}

export function equalsAmount(state: AmountState): AmountState {
  const value = currentAmount(state)
  if (value == null) return state
  return { acc: null, op: null, entry: formatPlain(value) }
}

export function backspaceAmount(state: AmountState): AmountState {
  if (state.entry) return { ...state, entry: state.entry.slice(0, -1) }
  if (state.op) return { ...state, op: null }
  if (state.acc != null) {
    const text = formatPlain(state.acc)
    return { acc: null, op: null, entry: text.slice(0, -1) }
  }
  return state
}
