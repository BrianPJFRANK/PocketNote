import type { AccountType, TxnType } from '../domain/types.ts'

export const ACCOUNT_ICON: Record<AccountType, string> = {
  cash: '💵',
  bank: '💳',
  credit: '💳',
  ewallet: '👛',
}

export const TXN_ICON: Record<TxnType, string> = {
  expense: '💸',
  income: '💰',
  transfer: '🔁',
  refund: '↩️',
}

export const ICON_CHOICES = ['✨', '⭐', '🏠', '🚗', '☕', '🎮', '📱', '🎵', '📚', '💡', '🛒', '🏋️', '🌿', '✈️', '🧾', '🎁', '💼', '🐶', '🍜', '💊']
