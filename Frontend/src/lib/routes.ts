import type { ModuleId } from '../domain/types.ts'

export function modulePath(moduleId: ModuleId): string {
  if (moduleId === 'ledger') return '/ledger'
  if (moduleId === 'memo') return '/memo'
  return '/todo'
}
