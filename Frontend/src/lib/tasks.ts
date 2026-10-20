import type { RepeatKind, Task } from '../domain/types.ts'
import { addDays, addMonths, isoDate, parseISODate, todayISO } from './date.ts'

export type TaskColumn = 'todo' | 'doing' | 'done' | 'expired'
export type TaskStatusFilter = 'all' | 'open' | 'done' | 'today' | 'overdue'
export type TaskSort = 'date' | 'priority' | 'created' | 'manual'

export function isOverdue(task: Task, today = todayISO()): boolean {
  return !task.done && !!task.dueDate && task.dueDate < today
}

export function columnOf(task: Task, today = todayISO()): TaskColumn {
  if (task.done) return 'done'
  if (isOverdue(task, today) && !task.boardPlaced) return 'expired'
  if (task.board === 'doing') return 'doing'
  return 'todo'
}

export function nextRepeatDate(due: string, repeat: RepeatKind): string {
  const date = parseISODate(due)
  if (repeat === 'daily') return isoDate(addDays(date, 1))
  if (repeat === 'weekly') return isoDate(addDays(date, 7))
  return isoDate(addMonths(date, 1))
}

export function matchTask(task: Task, status: TaskStatusFilter, query: string, categoryId: string | null, today = todayISO()): boolean {
  if (categoryId && task.categoryId !== categoryId) return false
  const needle = query.trim().toLowerCase()
  if (needle && !task.title.toLowerCase().includes(needle)) return false
  if (status === 'open') return !task.done
  if (status === 'done') return task.done
  if (status === 'today') return task.dueDate === today
  if (status === 'overdue') return isOverdue(task, today)
  return true
}

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function compareTasks(a: Task, b: Task, mode: TaskSort): number {
  if (mode === 'manual') return a.sortOrder - b.sortOrder
  if (mode === 'created') return b.createdAt.localeCompare(a.createdAt)
  if (mode === 'priority') {
    const left = a.priority ? priorityRank[a.priority] : 3
    const right = b.priority ? priorityRank[b.priority] : 3
    if (left !== right) return left - right
    return a.sortOrder - b.sortOrder
  }
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.dueDate && !b.dueDate) return -1
  if (!a.dueDate && b.dueDate) return 1
  if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) return a.dueTime < b.dueTime ? -1 : 1
  return a.sortOrder - b.sortOrder
}

export function streakCount(tasks: Task[], today = todayISO()): number {
  const days = new Set(tasks.filter((task) => task.done && task.completedAt).map((task) => task.completedAt!.slice(0, 10)))
  let cursor = parseISODate(today)
  if (!days.has(today)) {
    cursor = addDays(cursor, -1)
    if (!days.has(isoDate(cursor))) return 0
  }
  let count = 0
  while (days.has(isoDate(cursor))) {
    count += 1
    cursor = addDays(cursor, -1)
  }
  return count
}

export function todayAllDone(tasks: Task[], today = todayISO()): boolean {
  const todays = tasks.filter((task) => task.dueDate === today)
  return todays.length > 0 && todays.every((task) => task.done)
}
