import type { Named } from '../domain/types.ts'

export function displayName(item: Named, t: (key: string) => string): string {
  if (item.customName) return item.customName
  if (item.nameKey) return t(item.nameKey)
  return ''
}
