export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatHKD(amount: number): string {
  const rounded = roundMoney(amount)
  const sign = rounded < 0 ? '-' : ''
  const [whole, fraction] = Math.abs(rounded).toFixed(2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}HK$${grouped}.${fraction}`
}

export function formatCardHKD(amount: number): string {
  let scaled = Math.abs(amount)
  const suffixes = ['', 'k', 'M', 'B']
  let tier = 0
  while (scaled >= 999.5 && tier < suffixes.length - 1) {
    scaled /= 1000
    tier += 1
  }
  const rounded = tier === 0 ? Math.round(scaled) : Math.round(scaled * 10) / 10
  const sign = amount < 0 && rounded !== 0 ? '-' : ''
  const digits = tier === 0 || Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${sign}HK$${digits}${suffixes[tier]}`
}

export function groupAmount(text: string): string {
  const negative = text.startsWith('-')
  const raw = negative ? text.slice(1) : text
  const dot = raw.indexOf('.')
  const whole = dot === -1 ? raw : raw.slice(0, dot)
  const fraction = dot === -1 ? '' : raw.slice(dot)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${fraction}`
}

export function formatPlain(amount: number): string {
  const rounded = roundMoney(amount)
  if (Number.isInteger(rounded)) return String(rounded)
  return rounded.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')
}
