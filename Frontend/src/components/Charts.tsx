const palette = ['#7C3AED', '#A78BFA', '#C4B5FD', '#6D28D9', '#8B7BA3', '#DDD6FE', '#5B21B6', '#E9D5FF', '#4C1D95', '#F3E8FF', '#9333EA', '#C084FC']

export function pieColor(index: number): string {
  return palette[index % palette.length]
}

export function Pie({ slices }: { slices: { amount: number; color: string }[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  if (total <= 0) return null
  let cursor = 0
  const stops = slices.map((slice) => {
    const start = cursor
    cursor += (slice.amount / total) * 360
    return `${slice.color} ${start}deg ${cursor}deg`
  })
  return <div className="pie" style={{ background: `conic-gradient(${stops.join(',')})` }} />
}

export function LineChart({ values }: { values: number[] }) {
  const width = 320
  const height = 150
  const max = Math.max(...values, 1)
  const step = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((value, index) => `${index * step},${height - 16 - (value / max) * (height - 28)}`).join(' ')
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <polyline points={points} fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((value, index) => (
        <circle key={index} cx={index * step} cy={height - 16 - (value / max) * (height - 28)} r="3.5" fill="#3B2A54" />
      ))}
    </svg>
  )
}

export function NetChart({ income, expense }: { income: number[]; expense: number[] }) {
  const width = 320
  const height = 180
  const mid = height / 2
  const max = Math.max(...income, ...expense, 1)
  const step = income.length > 1 ? width / income.length : width
  const net = income.map((value, index) => value - expense[index])
  const netMax = Math.max(...net.map((value) => Math.abs(value)), 1)
  const line = net.map((value, index) => `${index * step + step / 2},${mid - (value / netMax) * (mid - 18)}`).join(' ')
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <line x1="0" x2={width} y1={mid} y2={mid} stroke="#F3E8FF" strokeWidth="2" />
      {income.map((value, index) => {
        const x = index * step + 8
        const bar = Math.max(step - 18, 8)
        return (
          <g key={index}>
            <rect x={x} y={mid - (value / max) * (mid - 16)} width={bar} height={(value / max) * (mid - 16)} rx="4" fill="#7C3AED" />
            <rect x={x} y={mid} width={bar} height={(expense[index] / max) * (mid - 16)} rx="4" fill="#E9D5FF" />
          </g>
        )
      })}
      <polyline points={line} fill="none" stroke="#3B2A54" strokeWidth="2.5" />
    </svg>
  )
}

export function Heat({ days, on }: { days: string[]; on: Set<string> }) {
  return (
    <div className="heat">
      {days.map((day) => (
        <i key={day} className={on.has(day) ? 'on' : ''} title={day} />
      ))}
    </div>
  )
}
