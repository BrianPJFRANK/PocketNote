const palette = ['#7C3AED', '#A78BFA', '#C4B5FD', '#6D28D9', '#8B7BA3', '#DDD6FE', '#5B21B6', '#E9D5FF', '#4C1D95', '#F3E8FF', '#9333EA', '#C084FC']

export function pieColor(index: number): string {
  return palette[index % palette.length]
}

export function Pie({ slices, donut = false }: { slices: { amount: number; color: string }[]; donut?: boolean }) {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0)
  if (total <= 0) return null
  let cursor = 0
  const stops = slices.map((slice) => {
    const start = cursor
    cursor += (slice.amount / total) * 360
    return `${slice.color} ${start}deg ${cursor}deg`
  })
  return <div className={donut ? 'pie donut' : 'pie'} style={{ background: `conic-gradient(${stops.join(',')})` }} />
}

const capRadius = 6

function barPath(x: number, y: number, w: number, h: number, cap: 'top' | 'bottom' | 'none'): string {
  const radius = cap === 'none' ? 0 : Math.min(capRadius, w / 2, h)
  if (radius <= 0) return `M${x} ${y}h${w}v${h}h${-w}z`
  if (cap === 'top') {
    return `M${x} ${y + radius}Q${x} ${y} ${x + radius} ${y}H${x + w - radius}Q${x + w} ${y} ${x + w} ${y + radius}V${y + h}H${x}z`
  }
  return `M${x} ${y}H${x + w}V${y + h - radius}Q${x + w} ${y + h} ${x + w - radius} ${y + h}H${x + radius}Q${x} ${y + h} ${x} ${y + h - radius}z`
}

export function StackedBars({ columns }: { columns: { segments: { value: number; color: string }[] }[] }) {
  const width = 320
  const height = 160
  const totals = columns.map((column) => column.segments.reduce((sum, segment) => sum + segment.value, 0))
  const max = Math.max(...totals, 1)
  const slot = width / Math.max(columns.length, 1)
  const barWidth = Math.min(slot * 0.55, 36)
  const plot = height - 8
  return (
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
      {columns.map((column, index) => {
        let y = height
        const x = index * slot + (slot - barWidth) / 2
        const pieces = column.segments.filter((segment) => segment.value > 0)
        return (
          <g key={index}>
            {pieces.map((segment, segmentIndex) => {
              const barHeight = (segment.value / max) * plot
              y -= barHeight
              const cap = segmentIndex === pieces.length - 1 ? 'top' : 'none'
              return <path key={segmentIndex} d={barPath(x, y, barWidth, barHeight, cap)} fill={segment.color} />
            })}
          </g>
        )
      })}
    </svg>
  )
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
  const height = 160
  const mid = height / 2
  const span = mid - 16
  const max = Math.max(...income, ...expense, 1)
  const count = Math.max(income.length, 1)
  const step = width / count
  const points = income.map((value, index) => ({
    x: index * step + step / 2,
    y: mid - ((value - expense[index]) / max) * span,
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <div className="net-chart">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img">
        <line x1="0" x2={width} y1={mid} y2={mid} stroke="#F3E8FF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {income.map((value, index) => {
          const bar = Math.max(step - 18, 8)
          const x = index * step + (step - bar) / 2
          const up = (value / max) * span
          const down = (expense[index] / max) * span
          return (
            <g key={index}>
              {up > 0 ? <path d={barPath(x, mid - up, bar, up, 'top')} fill="#2C624C" /> : null}
              {down > 0 ? <path d={barPath(x, mid, bar, down, 'bottom')} fill="#8E3A45" /> : null}
            </g>
          )
        })}
        <polyline points={line} fill="none" stroke="#3B2A54" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="net-dots">
        {points.map((point, index) => (
          <i key={index} style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }} />
        ))}
      </div>
    </div>
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
