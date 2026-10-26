import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar } from '../../components/Calendar.tsx'
import { EmptyState, PopMenu } from '../../components/Overlay.tsx'
import { MenuButton } from '../../components/Icon.tsx'
import { Mascot } from '../../components/Mascot.tsx'
import { todayISO } from '../../lib/date.ts'
import { displayName } from '../../lib/label.ts'
import { useFab } from '../../lib/useFab.ts'
import { todayAllDone } from '../../lib/tasks.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { TaskCard, TaskLayer } from './TaskLayer.tsx'
import type { Task } from '../../domain/types.ts'

export function CalendarPage() {
  const { t } = useTranslation()
  const tasks = useStore((state) => state.tasks)
  const categories = useStore((state) => state.categories)
  const toggleTaskDone = useStore((state) => state.toggleTaskDone)
  const setDrawer = useUi((state) => state.setDrawer)
  const today = todayISO()
  const [selected, setSelected] = useState(today)
  const [cursor, setCursor] = useState(() => new Date())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  useFab(true, () => setEditing('new'))

  const todoCategories = categories.filter((item) => item.kind === 'todo')
  const marks = useMemo(() => {
    const dates = new Set<string>()
    tasks.forEach((task) => {
      if (!task.dueDate) return
      if (categoryId && task.categoryId !== categoryId) return
      dates.add(task.dueDate)
    })
    return dates
  }, [tasks, categoryId])
  const visible = tasks
    .filter((task) => task.dueDate === selected && (!categoryId || task.categoryId === categoryId))
    .sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'))
  const current = todoCategories.find((item) => item.id === categoryId)

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
      </div>
      <Calendar
        cursor={cursor}
        onCursor={setCursor}
        selected={selected}
        onSelect={setSelected}
        marks={marks}
        right={
          <div className="menu-anchor">
            <button type="button" className="text-btn" onClick={() => setMenu((open) => !open)}>
              {current ? displayName(current, t) : t('common.all')}
            </button>
            <PopMenu open={menu} onClose={() => setMenu(false)} label={t('common.close')}>
              <button type="button" className={!categoryId ? 'menu-item on' : 'menu-item'} onClick={() => { setCategoryId(null); setMenu(false) }}>{t('common.all')}</button>
              {todoCategories.map((item) => (
                <button key={item.id} type="button" className={categoryId === item.id ? 'menu-item on' : 'menu-item'} onClick={() => { setCategoryId(item.id); setMenu(false) }}>
                  {displayName(item, t)}
                </button>
              ))}
            </PopMenu>
          </div>
        }
      />
      <div className="list">
        {visible.length ? visible.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            showDate={false}
            onOpen={() => setViewId(task.id)}
            onToggle={() => {
              const result = toggleTaskDone(task.id)
              if (result === 'record') setRecordId(task.id)
            }}
          />
        )) : <EmptyState text={t('todo.empty')} />}
        {selected === today && todayAllDone(tasks, today) ? (
          <div className="celebrate"><Mascot pose="celebrate" size="md" /></div>
        ) : null}
      </div>
      <TaskLayer
        editing={editing}
        viewId={viewId}
        recordId={recordId}
        deleteIds={null}
        onCloseEdit={() => setEditing(null)}
        onCloseView={() => setViewId(null)}
        onCloseRecord={() => setRecordId(null)}
        onCloseDelete={() => undefined}
      />
    </div>
  )
}
