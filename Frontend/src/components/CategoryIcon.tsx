import { categoryTint } from '../domain/categoryColor.ts'

const images = import.meta.glob('../assets/categories/{exp_categories,inc_categories,assets_categories}/*.{png,webp,svg,jpg,jpeg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const fileForId: Record<string, string> = {
  'exp.food': 'exp.food.png',
  'exp.transport': 'exp_transportation.png',
  'exp.housing': 'exp_housing.png',
  'exp.bills': 'exp_bill.png',
  'exp.shopping': 'exp_shopping.png',
  'exp.leisure': 'exp_entertainment.png',
  'exp.health': 'exp_health.png',
  'exp.education': 'exp_education.png',
  'exp.social': 'exp_social.png',
  'exp.finance': 'exp_finance.png',
  'exp.personal': 'exp_personal.png',
  'exp.other': 'exp_other.png',
  'inc.salary': 'inc_salary.png',
  'inc.part-time': 'inc_part-time.png',
  'inc.bonus': 'inc_bonus.png',
  'inc.investment': 'inc_investment.png',
  'inc.interest': 'inc_interest.png',
  'inc.gift': 'inc_gift.png',
  'inc.other': 'inc_other.png',
  'acc.cash': 'Cash.png',
  'acc.bank': 'BankCard.png',
  'acc.credit': 'creditCard.png',
}

function artwork(id: string): string | undefined {
  const name = fileForId[id]
  if (!name) return undefined
  return Object.entries(images).find(([path]) => path.replaceAll('\\', '/').endsWith(`/${name}`))?.[1]
}

export function CategoryIcon({ id, emoji, size = 28, fit = false }: { id: string; emoji: string; size?: number; fit?: boolean }) {
  const src = artwork(id)
  const color = categoryTint(id)
  return (
    <span className={color ? 'cat-ico cat-swatch' : 'cat-ico'} style={{ ...(fit ? {} : { width: size, height: size }), ...(color ? { background: color } : {}) }}>
      {src ? <img src={src} alt="" /> : <span style={fit ? undefined : { fontSize: Math.round(size * 0.62) }}>{emoji}</span>}
    </span>
  )
}
