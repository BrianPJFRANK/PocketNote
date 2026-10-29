const named: Record<string, string> = {
  'exp.food': '#E8893A',
  'exp.transport': '#3B82F6',
  'exp.housing': '#C4A484',
  'exp.bills': '#E3B341',
  'exp.shopping': '#E85A9B',
  'exp.leisure': '#8B5CF6',
  'exp.health': '#2EAF8A',
  'exp.education': '#5C6BC0',
  'exp.social': '#E15B64',
  'exp.finance': '#0E7490',
  'exp.personal': '#D46A4A',
  'exp.other': '#8E8AA3',
  'inc.salary': '#3F8F5B',
  'inc.part-time': '#84CC16',
  'inc.bonus': '#D97706',
  'inc.investment': '#0369A1',
  'inc.interest': '#7C3AED',
  'inc.gift': '#BE185D',
  'inc.other': '#64748B',
  'todo.work': '#1D4ED8',
  'todo.personal': '#9333EA',
  'todo.shopping': '#DB2777',
  'todo.other': '#78716C',
}

const extras = ['#0EA5E9', '#F97316', '#22C55E', '#A855F7', '#E11D48', '#0891B2', '#CA8A04', '#4F46E5', '#14B8A6', '#FB7185']

export function categoryColor(id: string): string | undefined {
  if (!id || id.startsWith('acc.')) return undefined
  if (named[id]) return named[id]
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return extras[hash % extras.length]
}

export function categoryTint(id: string): string | undefined {
  const color = categoryColor(id)
  if (!color) return undefined
  const value = Number.parseInt(color.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red}, ${green}, ${blue}, 0.24)`
}
