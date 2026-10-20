import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultAccounts, defaultCategories } from '../domain/defaults.ts'
import type {
  Account,
  AccountType,
  Backup,
  Category,
  CategoryKind,
  FixedExpense,
  Memo,
  ModuleId,
  Period,
  Settings,
  Snapshot,
  Task,
  Transaction,
} from '../domain/types.ts'
import { dueForMonthDay, sameDayNextMonth, todayISO } from '../lib/date.ts'
import i18n from '../i18n/index.ts'
import { detectLocale } from '../i18n/detect.ts'
import { makeId } from '../lib/id.ts'
import { currentMonthPeriod, shiftPeriod as movePeriod } from '../lib/period.ts'
import { isOverdue, nextRepeatDate } from '../lib/tasks.ts'

export function nextSortOrder(tasks: Task[]): number {
  if (!tasks.length) return 0
  return Math.min(...tasks.map((task) => task.sortOrder)) - 1
}

export function categoryUseCount(id: string, data: { transactions: Transaction[]; tasks: Task[]; fixedExpenses: FixedExpense[] }): number {
  return (
    data.transactions.filter((item) => item.categoryId === id).length +
    data.tasks.filter((item) => item.categoryId === id).length +
    data.fixedExpenses.filter((item) => item.categoryId === id).length
  )
}

export function accountInUse(id: string, data: { transactions: Transaction[]; fixedExpenses: FixedExpense[] }): boolean {
  return data.transactions.some((item) => item.accountId === id || item.toAccountId === id) || data.fixedExpenses.some((item) => item.accountId === id)
}

function cloneNext(task: Task, due: string, sortOrder: number): Task {
  return {
    ...task,
    id: makeId(),
    dueDate: due,
    done: false,
    completedAt: null,
    board: 'todo',
    boardPlaced: false,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask, id: makeId(), done: false })),
    createdAt: new Date().toISOString(),
    sortOrder,
    repeatSeriesId: task.repeatSeriesId ?? task.id,
  }
}

function markDone(tasks: Task[], id: string): Task[] {
  const task = tasks.find((item) => item.id === id)
  if (!task || task.done) return tasks
  const now = new Date().toISOString()
  const series = task.repeat && !task.fixedExpenseId ? (task.repeatSeriesId ?? task.id) : task.repeatSeriesId
  let next = tasks.map((item) =>
    item.id === id ? { ...item, done: true, completedAt: now, board: 'done' as const, repeatSeriesId: series } : item,
  )
  if (task.repeat && task.dueDate && !task.fixedExpenseId) {
    const due = task.dueDate
    const hasNext = next.some((item) => item.repeatSeriesId === series && !item.done && item.dueDate && item.dueDate > due)
    if (!hasNext) {
      const base = next.find((item) => item.id === id)
      if (base?.repeat) next = [...next, cloneNext(base, nextRepeatDate(due, base.repeat), nextSortOrder(next))]
    }
  }
  return next
}

function fixedTask(fx: FixedExpense, sortOrder: number): Task {
  return {
    id: makeId(),
    title: fx.name,
    categoryId: fx.categoryId,
    priority: null,
    dueDate: dueForMonthDay(fx.dayOfMonth),
    dueTime: null,
    repeat: 'monthly',
    reminder: 'onTime',
    tags: [],
    subtasks: [],
    note: '',
    done: false,
    completedAt: null,
    board: 'todo',
    boardPlaced: false,
    sortOrder,
    createdAt: new Date().toISOString(),
    repeatSeriesId: null,
    fixedExpenseId: fx.id,
  }
}

function takeSnapshot(state: Data): Snapshot {
  return {
    settings: state.settings,
    accounts: state.accounts,
    categories: state.categories,
    transactions: state.transactions,
    fixedExpenses: state.fixedExpenses,
    budgetTotal: state.budgetTotal,
    budgetByCategory: state.budgetByCategory,
    tasks: state.tasks,
    memos: state.memos,
    period: state.period,
  }
}

interface Data {
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
  backups: Backup[]
}

interface Actions {
  setLocale: (locale: Settings['locale']) => void
  setDefaultModule: (moduleId: ModuleId) => void
  enableLock: (passwordHash: string) => void
  disableLock: () => void
  setPasswordHash: (passwordHash: string) => void
  setBiometric: (enabled: boolean, credentialId: string | null) => void
  setGoogleEmail: (email: string | null) => void
  setMailboxEmail: (email: string | null) => void
  setPeriod: (period: Period) => void
  shiftPeriod: (dir: -1 | 1) => void
  addCategory: (kind: CategoryKind, name: string, icon: string) => Category
  renameCategory: (id: string, name: string) => void
  deleteCategory: (id: string) => void
  reassignCategory: (from: string, to: string) => void
  addAccount: (type: AccountType, name: string, initialAmount: number) => void
  updateAccount: (id: string, patch: { name?: string; initialAmount?: number }) => void
  deleteAccount: (id: string) => void
  addTransaction: (draft: Omit<Transaction, 'id' | 'createdAt' | 'refunded' | 'refundOfId'>) => Transaction
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  deleteTransaction: (id: string) => void
  refundTransaction: (id: string) => void
  setBudgetTotal: (amount: number | null) => void
  setCategoryBudget: (categoryId: string, amount: number | null) => void
  saveFixed: (draft: Omit<FixedExpense, 'id'> & { id?: string }) => void
  deleteFixed: (id: string) => void
  addTask: (task: Task) => void
  updateTask: (id: string, patch: Partial<Omit<Task, 'id'>>) => void
  deleteTask: (id: string, mode: 'single' | 'future') => void
  toggleTaskDone: (id: string) => 'record' | 'done'
  settleFixed: (id: string, mode: 'record' | 'skip') => void
  moveTask: (id: string, column: 'todo' | 'doing' | 'done' | 'expired') => 'record' | 'ok' | 'blocked'
  reorderTasks: (ids: string[]) => void
  toggleSubtask: (taskId: string, subId: string) => void
  addMemo: (partial: { title: string; body: string }) => Memo
  updateMemo: (id: string, patch: Partial<Omit<Memo, 'id'>>) => void
  trashMemos: (ids: string[]) => void
  restoreMemo: (id: string) => void
  destroyMemo: (id: string) => void
  purgeTrash: () => void
  createBackup: () => void
  restoreBackup: (id: string) => Settings | null
}

const freshSettings = (): Settings => ({
  locale: detectLocale(),
  defaultModule: 'todo',
  appLockEnabled: false,
  passwordHash: null,
  biometricEnabled: false,
  biometricCredentialId: null,
  googleEmail: null,
  mailboxEmail: null,
})

export const useStore = create<Data & Actions>()(
  persist(
    (set, get) => ({
      settings: freshSettings(),
      accounts: defaultAccounts,
      categories: defaultCategories,
      transactions: [],
      fixedExpenses: [],
      budgetTotal: null,
      budgetByCategory: {},
      tasks: [],
      memos: [],
      period: currentMonthPeriod(),
      backups: [],

      setLocale: (locale) => {
        void i18n.changeLanguage(locale)
        set({ settings: { ...get().settings, locale } })
      },
      setDefaultModule: (defaultModule) => set({ settings: { ...get().settings, defaultModule } }),
      enableLock: (passwordHash) => set({ settings: { ...get().settings, appLockEnabled: true, passwordHash } }),
      disableLock: () =>
        set({
          settings: {
            ...get().settings,
            appLockEnabled: false,
            passwordHash: null,
            biometricEnabled: false,
            biometricCredentialId: null,
          },
        }),
      setPasswordHash: (passwordHash) => set({ settings: { ...get().settings, passwordHash } }),
      setBiometric: (biometricEnabled, biometricCredentialId) =>
        set({ settings: { ...get().settings, biometricEnabled, biometricCredentialId } }),
      setGoogleEmail: (googleEmail) => set({ settings: { ...get().settings, googleEmail } }),
      setMailboxEmail: (mailboxEmail) => set({ settings: { ...get().settings, mailboxEmail } }),
      setPeriod: (period) => set({ period }),
      shiftPeriod: (dir) => set({ period: movePeriod(get().period, dir) }),

      addCategory: (kind, name, icon) => {
        const category: Category = { id: makeId(), kind, nameKey: null, customName: name.trim(), icon }
        set({ categories: [...get().categories, category] })
        return category
      },
      renameCategory: (id, name) =>
        set({ categories: get().categories.map((item) => (item.id === id ? { ...item, customName: name.trim() } : item)) }),
      deleteCategory: (id) => {
        const budgetByCategory = { ...get().budgetByCategory }
        delete budgetByCategory[id]
        set({ categories: get().categories.filter((item) => item.id !== id), budgetByCategory })
      },
      reassignCategory: (from, to) => {
        if (from === to) return
        const budgetByCategory = { ...get().budgetByCategory }
        delete budgetByCategory[from]
        set({
          categories: get().categories.filter((item) => item.id !== from),
          transactions: get().transactions.map((item) => (item.categoryId === from ? { ...item, categoryId: to } : item)),
          tasks: get().tasks.map((item) => (item.categoryId === from ? { ...item, categoryId: to } : item)),
          fixedExpenses: get().fixedExpenses.map((item) => (item.categoryId === from ? { ...item, categoryId: to } : item)),
          budgetByCategory,
        })
      },

      addAccount: (type, name, initialAmount) =>
        set({
          accounts: [...get().accounts, { id: makeId(), type, nameKey: null, customName: name.trim(), initialAmount }],
        }),
      updateAccount: (id, patch) =>
        set({
          accounts: get().accounts.map((item) =>
            item.id === id
              ? {
                  ...item,
                  customName: patch.name !== undefined ? patch.name.trim() : item.customName,
                  initialAmount: patch.initialAmount ?? item.initialAmount,
                }
              : item,
          ),
        }),
      deleteAccount: (id) => set({ accounts: get().accounts.filter((item) => item.id !== id) }),

      addTransaction: (draft) => {
        const transaction: Transaction = {
          ...draft,
          id: makeId(),
          refundOfId: null,
          refunded: false,
          createdAt: new Date().toISOString(),
        }
        set({ transactions: [transaction, ...get().transactions] })
        return transaction
      },
      updateTransaction: (id, patch) =>
        set({ transactions: get().transactions.map((item) => (item.id === id ? { ...item, ...patch, id } : item)) }),
      deleteTransaction: (id) => {
        const current = get().transactions.find((item) => item.id === id)
        if (!current) return
        let transactions = get().transactions.filter((item) => item.id !== id && item.refundOfId !== id)
        if (current.type === 'refund' && current.refundOfId) {
          transactions = transactions.map((item) => (item.id === current.refundOfId ? { ...item, refunded: false } : item))
        }
        set({ transactions })
      },
      refundTransaction: (id) => {
        const current = get().transactions.find((item) => item.id === id)
        if (!current || current.refunded || current.type === 'transfer' || current.type === 'refund') return
        const refund: Transaction = {
          id: makeId(),
          type: 'refund',
          amount: current.amount,
          date: todayISO(),
          categoryId: current.categoryId,
          accountId: current.accountId,
          toAccountId: null,
          note: '',
          refundOfId: current.id,
          refunded: false,
          createdAt: new Date().toISOString(),
        }
        set({
          transactions: [refund, ...get().transactions.map((item) => (item.id === id ? { ...item, refunded: true } : item))],
        })
      },

      setBudgetTotal: (budgetTotal) => set({ budgetTotal }),
      setCategoryBudget: (categoryId, amount) => {
        const budgetByCategory = { ...get().budgetByCategory }
        if (amount == null) delete budgetByCategory[categoryId]
        else budgetByCategory[categoryId] = amount
        set({ budgetByCategory })
      },

      saveFixed: (draft) => {
        const fx: FixedExpense = { ...draft, id: draft.id || makeId(), name: draft.name.trim(), dayOfMonth: draft.dayOfMonth }
        const previous = get().fixedExpenses.find((item) => item.id === fx.id)
        const fixedExpenses = previous ? get().fixedExpenses.map((item) => (item.id === fx.id ? fx : item)) : [...get().fixedExpenses, fx]
        let tasks = get().tasks
        const open = tasks.find((item) => item.fixedExpenseId === fx.id && !item.done)
        if (!fx.addToTodo) tasks = tasks.filter((item) => !(item.fixedExpenseId === fx.id && !item.done))
        else if (open) {
          const dayChanged = !previous || previous.dayOfMonth !== fx.dayOfMonth
          tasks = tasks.map((item) =>
            item.id === open.id
              ? { ...item, title: fx.name, categoryId: fx.categoryId, dueDate: dayChanged ? dueForMonthDay(fx.dayOfMonth) : item.dueDate, repeat: 'monthly' }
              : item,
          )
        } else tasks = [fixedTask(fx, nextSortOrder(tasks)), ...tasks]
        set({ fixedExpenses, tasks })
      },
      deleteFixed: (id) =>
        set({
          fixedExpenses: get().fixedExpenses.filter((item) => item.id !== id),
          tasks: get().tasks.filter((item) => !(item.fixedExpenseId === id && !item.done)),
        }),

      addTask: (task) => set({ tasks: [task, ...get().tasks] }),
      updateTask: (id, patch) => {
        const tasks = get().tasks.map((item) => (item.id === id ? { ...item, ...patch } : item))
        const task = tasks.find((item) => item.id === id)
        let fixedExpenses = get().fixedExpenses
        if (task?.fixedExpenseId) {
          fixedExpenses = fixedExpenses.map((item) => {
            if (item.id !== task.fixedExpenseId) return item
            const day = task.dueDate ? Number(task.dueDate.slice(8, 10)) : item.dayOfMonth
            return { ...item, name: task.title.trim() || item.name, categoryId: task.categoryId, dayOfMonth: day }
          })
        }
        set({ tasks, fixedExpenses })
      },
      deleteTask: (id, mode) => {
        const task = get().tasks.find((item) => item.id === id)
        if (!task) return
        if (task.fixedExpenseId && !task.done) {
          set({
            tasks: get().tasks.filter((item) => item.id !== id),
            fixedExpenses: get().fixedExpenses.map((item) => (item.id === task.fixedExpenseId ? { ...item, addToTodo: false } : item)),
          })
          return
        }
        const series = task.repeat && task.repeatSeriesId ? task.repeatSeriesId : null
        if (series && mode === 'future') {
          set({
            tasks: get().tasks.filter((item) => {
              if (item.repeatSeriesId !== series) return true
              if (!item.dueDate || !task.dueDate) return false
              return item.dueDate < task.dueDate
            }),
          })
          return
        }
        if (task.repeat && task.dueDate && mode === 'single') {
          const due = task.dueDate
          const seriesId = task.repeatSeriesId ?? task.id
          const later = get().tasks.some((item) => item.id !== id && item.repeatSeriesId === seriesId && !item.done && !!item.dueDate && item.dueDate > due)
          const base = { ...task, repeatSeriesId: seriesId }
          const spawned = later ? [] : [cloneNext(base, nextRepeatDate(due, task.repeat), nextSortOrder(get().tasks))]
          set({ tasks: [...get().tasks.filter((item) => item.id !== id), ...spawned] })
          return
        }
        set({ tasks: get().tasks.filter((item) => item.id !== id) })
      },
      toggleTaskDone: (id) => {
        const task = get().tasks.find((item) => item.id === id)
        if (!task) return 'done'
        if (task.fixedExpenseId) return task.done ? 'done' : 'record'
        if (task.done) {
          set({
            tasks: get().tasks.map((item) => (item.id === id ? { ...item, done: false, completedAt: null, board: 'todo', boardPlaced: false } : item)),
          })
          return 'done'
        }
        set({ tasks: markDone(get().tasks, id) })
        return 'done'
      },
      settleFixed: (id, mode) => {
        const task = get().tasks.find((item) => item.id === id)
        if (!task?.fixedExpenseId || !task.dueDate) return
        const fx = get().fixedExpenses.find((item) => item.id === task.fixedExpenseId)
        if (!fx) return
        const now = new Date().toISOString()
        const doneTask: Task = { ...task, done: true, completedAt: now, board: 'done' }
        const openOther = get().tasks.some((item) => item.fixedExpenseId === fx.id && item.id !== id && !item.done)
        const next: Task | null = openOther
          ? null
          : {
              ...doneTask,
              id: makeId(),
              title: fx.name,
              categoryId: fx.categoryId,
              dueDate: sameDayNextMonth(task.dueDate, fx.dayOfMonth),
              done: false,
              completedAt: null,
              board: 'todo',
              boardPlaced: false,
              subtasks: [],
              createdAt: now,
              sortOrder: nextSortOrder(get().tasks),
              repeat: 'monthly',
              reminder: 'onTime',
              fixedExpenseId: fx.id,
              repeatSeriesId: null,
            }
        const transactions = get().transactions
        const created: Transaction | null =
          mode === 'record'
            ? {
                id: makeId(),
                type: 'expense',
                amount: fx.amount,
                date: task.dueDate,
                categoryId: fx.categoryId,
                accountId: fx.accountId,
                toAccountId: null,
                note: fx.name,
                refundOfId: null,
                refunded: false,
                createdAt: now,
              }
            : null
        set({
          tasks: [...get().tasks.map((item) => (item.id === id ? doneTask : item)), ...(next ? [next] : [])],
          transactions: created ? [created, ...transactions] : transactions,
        })
      },
      moveTask: (id, column) => {
        const task = get().tasks.find((item) => item.id === id)
        if (!task) return 'ok'
        if (column === 'expired') return isOverdue(task) ? 'ok' : 'blocked'
        if (task.fixedExpenseId && task.done && column !== 'done') return 'blocked'
        if (column === 'done') {
          if (task.fixedExpenseId && !task.done) return 'record'
          if (!task.done) set({ tasks: markDone(get().tasks, id) })
          return 'ok'
        }
        set({
          tasks: get().tasks.map((item) =>
            item.id === id ? { ...item, done: false, completedAt: null, board: column, boardPlaced: true } : item,
          ),
        })
        return 'ok'
      },
      reorderTasks: (ids) => {
        const order = new Map(ids.map((id, index) => [id, index]))
        set({ tasks: get().tasks.map((item) => (order.has(item.id) ? { ...item, sortOrder: order.get(item.id) ?? item.sortOrder } : item)) })
      },
      toggleSubtask: (taskId, subId) =>
        set({
          tasks: get().tasks.map((item) =>
            item.id === taskId ? { ...item, subtasks: item.subtasks.map((sub) => (sub.id === subId ? { ...sub, done: !sub.done } : sub)) } : item,
          ),
        }),

      addMemo: ({ title, body }) => {
        const now = new Date().toISOString()
        const memo: Memo = { id: makeId(), title, body, pinned: false, categories: [], tags: [], createdAt: now, updatedAt: now, deletedAt: null }
        set({ memos: [memo, ...get().memos] })
        return memo
      },
      updateMemo: (id, patch) =>
        set({
          memos: get().memos.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)),
        }),
      trashMemos: (ids) => {
        const now = new Date().toISOString()
        const chosen = new Set(ids)
        set({ memos: get().memos.map((item) => (chosen.has(item.id) ? { ...item, deletedAt: now } : item)) })
      },
      restoreMemo: (id) => set({ memos: get().memos.map((item) => (item.id === id ? { ...item, deletedAt: null } : item)) }),
      destroyMemo: (id) => set({ memos: get().memos.filter((item) => item.id !== id) }),
      purgeTrash: () => {
        const limit = 30 * 24 * 60 * 60 * 1000
        set({
          memos: get().memos.filter((item) => !item.deletedAt || Date.now() - new Date(item.deletedAt).getTime() < limit),
        })
      },

      createBackup: () => {
        const backup: Backup = { id: makeId(), createdAt: new Date().toISOString(), snapshot: takeSnapshot(get()) }
        set({ backups: [backup, ...get().backups].slice(0, 5) })
      },
      restoreBackup: (id) => {
        const backup = get().backups.find((item) => item.id === id)
        if (!backup) return null
        const snap = backup.snapshot
        set({
          settings: snap.settings,
          accounts: snap.accounts,
          categories: snap.categories,
          transactions: snap.transactions,
          fixedExpenses: snap.fixedExpenses,
          budgetTotal: snap.budgetTotal,
          budgetByCategory: snap.budgetByCategory,
          tasks: snap.tasks,
          memos: snap.memos,
          period: snap.period,
        })
        void i18n.changeLanguage(snap.settings.locale)
        return snap.settings
      },
    }),
    {
      name: 'pocketnote',
      partialize: (state) => ({
        settings: state.settings,
        accounts: state.accounts,
        categories: state.categories,
        transactions: state.transactions,
        fixedExpenses: state.fixedExpenses,
        budgetTotal: state.budgetTotal,
        budgetByCategory: state.budgetByCategory,
        tasks: state.tasks,
        memos: state.memos,
        period: state.period,
        backups: state.backups,
      }),
      version: 1,
    },
  ),
)
