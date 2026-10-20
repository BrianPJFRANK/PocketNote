import type { Account, Category } from './types.ts'

export const defaultCategories: Category[] = [
  { id: 'exp.food', kind: 'expense', nameKey: 'cat.expFood', customName: null, icon: '🍽️' },
  { id: 'exp.transport', kind: 'expense', nameKey: 'cat.expTransport', customName: null, icon: '🚌' },
  { id: 'exp.housing', kind: 'expense', nameKey: 'cat.expHousing', customName: null, icon: '🏠' },
  { id: 'exp.bills', kind: 'expense', nameKey: 'cat.expBills', customName: null, icon: '🧾' },
  { id: 'exp.shopping', kind: 'expense', nameKey: 'cat.expShopping', customName: null, icon: '🛍️' },
  { id: 'exp.leisure', kind: 'expense', nameKey: 'cat.expLeisure', customName: null, icon: '🎬' },
  { id: 'exp.health', kind: 'expense', nameKey: 'cat.expHealth', customName: null, icon: '💊' },
  { id: 'exp.education', kind: 'expense', nameKey: 'cat.expEducation', customName: null, icon: '📚' },
  { id: 'exp.social', kind: 'expense', nameKey: 'cat.expSocial', customName: null, icon: '🎁' },
  { id: 'exp.finance', kind: 'expense', nameKey: 'cat.expFinance', customName: null, icon: '🏦' },
  { id: 'exp.personal', kind: 'expense', nameKey: 'cat.expPersonal', customName: null, icon: '💅' },
  { id: 'exp.other', kind: 'expense', nameKey: 'cat.expOther', customName: null, icon: '✨' },
  { id: 'inc.salary', kind: 'income', nameKey: 'cat.incSalary', customName: null, icon: '💼' },
  { id: 'inc.part-time', kind: 'income', nameKey: 'cat.incPartTime', customName: null, icon: '🕒' },
  { id: 'inc.bonus', kind: 'income', nameKey: 'cat.incBonus', customName: null, icon: '🏆' },
  { id: 'inc.investment', kind: 'income', nameKey: 'cat.incInvestment', customName: null, icon: '📈' },
  { id: 'inc.interest', kind: 'income', nameKey: 'cat.incInterest', customName: null, icon: '💰' },
  { id: 'inc.gift', kind: 'income', nameKey: 'cat.incGift', customName: null, icon: '🎀' },
  { id: 'inc.other', kind: 'income', nameKey: 'cat.incOther', customName: null, icon: '💵' },
  { id: 'todo.work', kind: 'todo', nameKey: 'cat.todoWork', customName: null, icon: '💼' },
  { id: 'todo.personal', kind: 'todo', nameKey: 'cat.todoPersonal', customName: null, icon: '👤' },
  { id: 'todo.shopping', kind: 'todo', nameKey: 'cat.todoShopping', customName: null, icon: '🛍️' },
  { id: 'todo.other', kind: 'todo', nameKey: 'cat.todoOther', customName: null, icon: '📌' },
]

export const defaultAccounts: Account[] = [
  { id: 'acc-cash', type: 'cash', nameKey: 'account.cash', customName: null, initialAmount: 0 },
  { id: 'acc-bank', type: 'bank', nameKey: 'account.bank', customName: null, initialAmount: 0 },
  { id: 'acc-credit', type: 'credit', nameKey: 'account.credit', customName: null, initialAmount: 0 },
]
