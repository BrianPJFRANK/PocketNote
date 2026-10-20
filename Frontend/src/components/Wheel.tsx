import { useEffect, useRef } from 'react'
import { haptic } from '../lib/haptic.ts'

const ITEM = 40

export function Wheel({ values, value, onChange, label }: { values: string[]; value: string; onChange: (value: string) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const index = Math.max(0, values.indexOf(value))
    const current = Math.round(node.scrollTop / ITEM)
    if (index !== current) node.scrollTop = index * ITEM
  }, [value, values])

  return (
    <div className="wheel-wrap">
      <div className="wheel-focus" />
      <div
        ref={ref}
        className="wheel"
        role="listbox"
        aria-label={label}
        onScroll={() => {
          const node = ref.current
          if (!node) return
          const index = Math.max(0, Math.min(values.length - 1, Math.round(node.scrollTop / ITEM)))
          const next = values[index]
          if (next && next !== value) {
            haptic()
            onChange(next)
          }
        }}
      >
        <span className="wheel-pad" />
        <span className="wheel-pad" />
        {values.map((item) => (
          <button key={item} type="button" className={item === value ? 'wheel-item on' : 'wheel-item'} onClick={() => onChange(item)}>
            {item}
          </button>
        ))}
        <span className="wheel-pad" />
        <span className="wheel-pad" />
      </div>
    </div>
  )
}

export function TimeWheels({ hour, minute, onHour, onMinute }: { hour: string; minute: string; onHour: (value: string) => void; onMinute: (value: string) => void }) {
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))
  return (
    <div className="wheels">
      <Wheel values={hours} value={hour} onChange={onHour} label={hour} />
      <Wheel values={minutes} value={minute} onChange={onMinute} label={minute} />
    </div>
  )
}
