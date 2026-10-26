import { useMemo, useState, type ReactNode } from 'react'
import { DndContext, PointerSensor, closestCenter, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import type { Task } from '../../domain/types.ts'
import { EmptyState, PopMenu, SearchField } from '../../components/Overlay.tsx'
import { MenuButton } from '../../components/Icon.tsx'
import { displayName } from '../../lib/label.ts'
import { todayISO } from '../../lib/date.ts'
import { useFab } from '../../lib/useFab.ts'
import { columnOf, compareTasks, matchTask, type TaskColumn, type TaskSort, type TaskStatusFilter } from '../../lib/tasks.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'
import { TaskCard, TaskLayer } from './TaskLayer.tsx'

const statuses: TaskStatusFilter[] = ['all', 'open', 'done', 'today', 'overdue']

export function TasksPage() {
  const { t } = useTranslation()
  const tasks = useStore((state) => state.tasks)
  const categories = useStore((state) => state.categories)
  const toggleTaskDone = useStore((state) => state.toggleTaskDone)
  const moveTask = useStore((state) => state.moveTask)
  const reorderTasks = useStore((state) => state.reorderTasks)
  const setDrawer = useUi((state) => state.setDrawer)
  const [status, setStatus] = useState<TaskStatusFilter>('all')
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<TaskSort>('date')
  const [board, setBoard] = useState(false)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [menu, setMenu] = useState<'category' | 'sort' | null>(null)
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)
  const today = todayISO()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  useFab(!picking, () => setEditing('new'))

  const todoCategories = categories.filter((item) => item.kind === 'todo')
  const visible = useMemo(
    () => tasks.filter((task) => matchTask(task, status, query, categoryId, today)).sort((a, b) => compareTasks(a, b, sortMode)),
    [tasks, status, query, categoryId, today, sortMode],
  )

  function toggle(id: string) {
    const result = toggleTaskDone(id)
    if (result === 'record') setRecordId(id)
  }

  function onListDrag(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const ids = visible.map((task) => task.id)
    const from = ids.indexOf(String(event.active.id))
    const to = ids.indexOf(String(event.over.id))
    if (from < 0 || to < 0) return
    const moved = arrayMove(ids, from, to)
    const visibleSet = new Set(ids)
    let cursor = 0
    const full = [...tasks].sort((a, b) => compareTasks(a, b, sortMode)).map((task) => task.id)
    reorderTasks(full.map((id) => (visibleSet.has(id) ? moved[cursor++] : id)))
    setSortMode('manual')
  }

  function onBoardDrag(event: DragEndEvent) {
    if (!event.over) return
    const overId = String(event.over.id)
    const target = tasks.find((task) => task.id === overId)
    const column: TaskColumn | null = overId.startsWith('col-') ? (overId.slice(4) as TaskColumn) : target ? columnOf(target, today) : null
    if (!column) return
    const result = moveTask(String(event.active.id), column)
    if (result === 'record') setRecordId(String(event.active.id))
  }

  const statusLabel: Record<TaskStatusFilter, string> = {
    all: t('common.all'),
    open: t('todo.statusOpen'),
    done: t('todo.statusDone'),
    today: t('todo.statusToday'),
    overdue: t('todo.statusOverdue'),
  }

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <strong className="head-title">{t('nav.allTasks')}</strong>
        {picking ? (
          <button type="button" className="text-btn" onClick={() => { setPicking(false); setPicked([]) }}>{t('common.done')}</button>
        ) : <span className="icon-spacer" />}
      </div>
      <div className="h-scroll">
        {statuses.map((item) => (
          <button key={item} type="button" className={status === item ? 'chip on' : 'chip'} onClick={() => setStatus(item)}>{statusLabel[item]}</button>
        ))}
      </div>
      <SearchField value={query} onChange={setQuery} placeholder={t('todo.search')} />
      <div className="tool-row">
        <div className="menu-anchor">
          <button type="button" className="text-btn" onClick={() => setMenu('category')}>{categoryId ? displayName(todoCategories.find((item) => item.id === categoryId) ?? { nameKey: null, customName: t('common.all') }, t) : t('common.all')}</button>
          <PopMenu open={menu === 'category'} onClose={() => setMenu(null)} label={t('common.close')}>
            <button type="button" className="menu-item" onClick={() => { setCategoryId(null); setMenu(null) }}>{t('common.all')}</button>
            {todoCategories.map((item) => (
              <button key={item.id} type="button" className="menu-item" onClick={() => { setCategoryId(item.id); setMenu(null) }}>{displayName(item, t)}</button>
            ))}
          </PopMenu>
        </div>
        <div className="menu-anchor">
          <button type="button" className="text-btn" onClick={() => setMenu('sort')}>{t('todo.sort')}</button>
          <PopMenu open={menu === 'sort'} onClose={() => setMenu(null)} label={t('common.close')}>
            <button type="button" className="menu-item" onClick={() => { setSortMode('date'); setMenu(null) }}>{t('todo.sortDate')}</button>
            <button type="button" className="menu-item" onClick={() => { setSortMode('priority'); setMenu(null) }}>{t('todo.sortPriority')}</button>
            <button type="button" className="menu-item" onClick={() => { setSortMode('created'); setMenu(null) }}>{t('todo.sortCreated')}</button>
          </PopMenu>
        </div>
        {!picking ? <button type="button" className="text-btn" onClick={() => setPicking(true)}>{t('todo.multi')}</button> : null}
        <button type="button" className="text-btn" onClick={() => setBoard((value) => !value)}>{board ? t('todo.list') : t('todo.board')}</button>
      </div>
      {board ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBoardDrag}>
          <div className="board">
            {(['todo', 'doing', 'done', 'expired'] as TaskColumn[]).map((column) => (
              <BoardColumn key={column} id={column} title={t(column === 'todo' ? 'todo.colTodo' : column === 'doing' ? 'todo.colDoing' : column === 'done' ? 'todo.colDone' : 'todo.colExpired')}>
                {visible.filter((task) => columnOf(task, today) === column).map((task) => (
                  <BoardCard key={task.id} task={task} onOpen={() => (picking ? setPicked(toggleId(picked, task.id)) : setViewId(task.id))} onToggle={() => toggle(task.id)} />
                ))}
              </BoardColumn>
            ))}
          </div>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onListDrag}>
          <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <div className="list">
              {visible.length ? visible.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  disabled={picking}
                  onOpen={() => (picking ? setPicked(toggleId(picked, task.id)) : setViewId(task.id))}
                  onToggle={() => toggle(task.id)}
                  picked={picked.includes(task.id)}
                  onPick={picking ? () => setPicked(toggleId(picked, task.id)) : undefined}
                />
              )) : <EmptyState text={t('todo.empty')} compact={tasks.length > 0} />}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {picking ? (
        <div className="selectbar">
          <span>{t('memo.selected', { count: picked.length })}</span>
          <button
            type="button"
            className="btn danger"
            disabled={!picked.length}
            onClick={() => {
              const chosen = tasks.filter((task) => picked.includes(task.id))
              if (chosen.some((task) => task.repeat && !task.fixedExpenseId)) setDeleteIds(picked)
              else {
                chosen.forEach((task) => useStore.getState().deleteTask(task.id, 'single'))
                setPicked([])
                setPicking(false)
              }
            }}
          >
            {t('common.delete')}
          </button>
        </div>
      ) : null}
      <TaskLayer
        editing={editing}
        viewId={viewId}
        recordId={recordId}
        deleteIds={deleteIds}
        onCloseEdit={() => setEditing(null)}
        onCloseView={() => setViewId(null)}
        onCloseRecord={() => setRecordId(null)}
        onCloseDelete={() => { setDeleteIds(null); setPicked([]); setPicking(false) }}
      />
    </div>
  )
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}

function SortableTask({ task, disabled, onOpen, onToggle, picked, onPick }: { task: Task; disabled: boolean; onOpen: () => void; onToggle: () => void; picked: boolean; onPick?: () => void }) {
  const sortable = useSortable({ id: task.id, disabled })
  return (
    <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} {...sortable.attributes} {...sortable.listeners}>
      <TaskCard task={task} showDate onOpen={onOpen} onToggle={onToggle} picked={picked} onPick={onPick} />
    </div>
  )
}

function BoardColumn({ id, title, children }: { id: TaskColumn; title: string; children: ReactNode }) {
  const drop = useDroppable({ id: `col-${id}` })
  return (
    <section ref={drop.setNodeRef} className={drop.isOver ? 'board-col over' : 'board-col'}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function BoardCard({ task, onOpen, onToggle }: { task: Task; onOpen: () => void; onToggle: () => void }) {
  const drag = useDraggable({ id: task.id })
  return (
    <div ref={drag.setNodeRef} style={{ transform: CSS.Translate.toString(drag.transform) }} {...drag.attributes} {...drag.listeners}>
      <TaskCard task={task} showDate onOpen={onOpen} onToggle={onToggle} />
    </div>
  )
}
