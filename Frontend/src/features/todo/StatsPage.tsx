import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Heat, Pie } from '../../components/Charts.tsx'
import { categoryColor } from '../../domain/categoryColor.ts'
import { MenuButton } from '../../components/Icon.tsx'
import { Mascot } from '../../components/Mascot.tsx'
import { addDays, eachDate, isoDate, startOfWeek, todayISO } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { streakCount } from '../../lib/tasks.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'

export function StatsPage() {
  const { t } = useTranslation()
  const tasks = useStore((state) => state.tasks)
  const categories = useStore((state) => state.categories)
  const setDrawer = useUi((state) => state.setDrawer)
  const [span, setSpan] = useState<'week' | 'month'>('month')
  const now = new Date()
  const start = span === 'week' ? isoDate(startOfWeek(now)) : isoDate(new Date(now.getFullYear(), now.getMonth(), 1))
  const end = span === 'week' ? isoDate(addDays(startOfWeek(now), 6)) : isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const periodTasks = tasks.filter((task) => task.dueDate && task.dueDate >= start && task.dueDate <= end)
  const done = periodTasks.filter((task) => task.done)
  const rate = periodTasks.length ? Math.round((done.length / periodTasks.length) * 100) : null
  const counts = new Map<string, number>()
  done.forEach((task) => counts.set(task.categoryId, (counts.get(task.categoryId) ?? 0) + 1))
  const slices = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const total = slices.reduce((sum, item) => sum + item[1], 0)
  const heatDays = eachDate(start, end)
  const finished = new Set(
    tasks
      .filter((task) => task.done && task.completedAt)
      .map((task) => task.completedAt!.slice(0, 10))
      .filter((day) => day >= start && day <= end),
  )

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <strong className="head-title">{t('nav.stats')}</strong>
        <span className="icon-spacer" />
      </div>
      <div className="seg">
        <button type="button" className={span === 'week' ? 'on' : ''} onClick={() => setSpan('week')}>{t('todo.week')}</button>
        <button type="button" className={span === 'month' ? 'on' : ''} onClick={() => setSpan('month')}>{t('todo.month')}</button>
      </div>
      <div className="split">
        <article className="card stat">
          <Mascot pose="celebrate" size="sm" />
          <strong>{streakCount(tasks, todayISO())}</strong>
          <span>{t('todo.streak')}</span>
          <em>{t('todo.days', { count: streakCount(tasks, todayISO()) })}</em>
        </article>
        <article className="card stat">
          <strong>{rate == null ? '—' : `${rate}%`}</strong>
          <span>{t('todo.rate')}</span>
          {rate == null ? <em>{t('todo.noStats')}</em> : null}
        </article>
      </div>
      <article className="card stack">
        <h3>{t('todo.pie')}</h3>
        {total ? (
          <div className="chart-row">
            <Pie slices={slices.map((item) => ({ amount: item[1], color: categoryColor(item[0]) ?? '#8E8AA3' }))} />
            <ul className="legend">
              {slices.slice(0, 5).map((item) => {
                const category = categories.find((entry) => entry.id === item[0])
                return (
                  <li key={item[0]}>
                    <i style={{ background: categoryColor(item[0]) }} />
                    {category ? displayName(category, t) : item[0]}
                    <b>{Math.round((item[1] / total) * 100)}%</b>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : <p className="muted">{t('todo.noStats')}</p>}
      </article>
      <article className="card stack">
        <h3>{t('todo.heat')}</h3>
        <Heat days={heatDays} on={finished} />
      </article>
    </div>
  )
}
