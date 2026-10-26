const budgetImages = import.meta.glob('../../assets/budgets/*.png', { eager: true, import: 'default' }) as Record<string, string>

export function budgetSrc(name: string): string | undefined {
  return Object.entries(budgetImages).find(([path]) => path.replaceAll('\\', '/').endsWith(`/${name}.png`))?.[1]
}

export function budgetPose(ratio: number): string {
  if (ratio >= 1) return 'budget_outofbudget'
  if (ratio >= 0.75) return 'budget_reachlimit'
  if (ratio >= 0.4) return 'budget_medium'
  return 'budget_low'
}
