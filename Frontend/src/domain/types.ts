export type Locale = 'zh-TW' | 'zh-CN' | 'en'

export type ModuleId = 'todo' | 'ledger' | 'memo'

export type Priority = 'high' | 'medium' | 'low'

export type RepeatKind = 'daily' | 'weekly' | 'monthly'

export type ReminderKind = 'unset' | 'none' | 'onTime' | 'hour' | 'day'

export type BoardLane = 'todo' | 'doing' | 'done'

export type AccountType = 'cash' | 'bank' | 'credit' | 'ewallet'

export type CategoryKind = 'expense' | 'income' | 'todo'

export type TxnType = 'expense' | 'income' | 'transfer' | 'refund'

export interface Category {
  id: string
  kind: CategoryKind
  nameKey: string | null
  customName: string | null
  icon: string
}

export interface Account {
  id: string
  type: AccountType
  nameKey: string | null
  customName: string | null
  initialAmount: number
}

export interface Transaction {
  id: string
  type: TxnType
  amount: number
  date: string
  categoryId: string | null
  accountId: string | null
  toAccountId: string | null
  note: string
  refundOfId: string | null
  refunded: boolean
  createdAt: string
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  categoryId: string
  accountId: string
  dayOfMonth: number
  addToTodo: boolean
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  categoryId: string
  priority: Priority | null
  dueDate: string | null
  dueTime: string | null
  repeat: RepeatKind | null
  reminder: ReminderKind
  tags: string[]
  subtasks: Subtask[]
  note: string
  done: boolean
  completedAt: string | null
  board: BoardLane
  /** When true, an overdue task stays in the lane the user dragged it to. */
  boardPlaced: boolean
  sortOrder: number
  createdAt: string
  repeatSeriesId: string | null
  fixedExpenseId: string | null
}

export interface Memo {
  id: string
  title: string
  body: string
  pinned: boolean
  categories: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type Period =
  | { kind: 'week'; start: string }
  | { kind: 'month'; start: string; end: string }
  | { kind: 'year'; start: number; end: number }
  | { kind: 'custom'; start: string; end: string }

export interface Settings {
  locale: Locale
  defaultModule: ModuleId
  appLockEnabled: boolean
  passwordHash: string | null
  biometricEnabled: boolean
  biometricCredentialId: string | null
  googleEmail: string | null
  mailboxEmail: string | null
}

export interface Snapshot {
  settings: Settings
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  fixedExpenses: FixedExpense[]
  budgetTotal: number | null
  budgetByCategory: Record<string, number>
  tasks: Task[]
  memos: Memo[]
  period: Period
}

export interface Backup {
  id: string
  createdAt: string
  snapshot: Snapshot
}

export interface Named {
  nameKey: string | null
  customName: string | null
}
