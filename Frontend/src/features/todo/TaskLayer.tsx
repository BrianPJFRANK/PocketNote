import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Priority, ReminderKind, RepeatKind, Subtask, Task } from '../../domain/types.ts'
import { CategoryIcon } from '../../components/CategoryIcon.tsx'
import { Calendar } from '../../components/Calendar.tsx'
import { CategorySheet } from '../../components/CategorySheet.tsx'
import { CheckBubble, Icon } from '../../components/Icon.tsx'
import { Dialog, BottomSheet, SheetHeader } from '../../components/Overlay.tsx'
import { TimeWheels } from '../../components/Wheel.tsx'
import { Switch } from '../../components/Icon.tsx'
import { addDays, formatMonthDay, isoDate, parseISODate, todayISO, weekdayLong, weekdayNarrow } from '../../lib/date.ts'
import { formatHKD } from '../../lib/money.ts'
import { displayName } from '../../lib/label.ts'
import { makeId } from '../../lib/id.ts'
import { nextSortOrder, useStore } from '../../store/useStore.ts'

function dueText(date: string | null, today: string, locale: string, unset: string, todayWord: string, tomorrowWord: string): string {
  if (!date) return unset
  if (date === today) return todayWord
  if (date === isoDate(addDays(parseISODate(today), 1))) return tomorrowWord
  return formatMonthDay(parseISODate(date), locale)
}

export function TaskCard({
  task,
  showDate,
  onOpen,
  onToggle,
  picked,
  onPick,
}: {
  task: Task
  showDate: boolean
  onOpen: () => void
  onToggle: () => void
  picked?: boolean
  onPick?: () => void
}) {
  const { t, i18n } = useTranslation()
  const categories = useStore((state) => state.categories)
  const category = categories.find((item) => item.id === task.categoryId)
  const doneCount = task.subtasks.filter((item) => item.done).length
  const today = todayISO()
  const meta: string[] = []
  if (task.subtasks.length) meta.push(`${doneCount}/${task.subtasks.length}`)
  if (showDate && task.dueDate) meta.push(dueText(task.dueDate, today, i18n.language, '', '', '') || formatMonthDay(parseISODate(task.dueDate), i18n.language))
  if (task.dueTime) meta.push(task.dueTime)

  return (
    <article className="task" data-priority={task.priority ?? 'none'} onClick={onPick ?? onOpen}>
      {onPick ? <span className={picked ? 'tick on' : 'tick'}>{picked ? <Icon name="check" size={14} /> : null}</span> : null}
      <CategoryIcon id={category?.id ?? 'todo.other'} emoji={category?.icon ?? '📌'} />
      <div className="task-copy">
        {meta.length ? (
          <div className="task-top">
            {task.subtasks.length ? <span className="pill">{doneCount}/{task.subtasks.length}</span> : null}
            <span>{meta.filter((_, index) => !(task.subtasks.length && index === 0)).join(' · ')}</span>
          </div>
        ) : null}
        <strong className={task.done ? 'done-title' : ''}>{task.title}</strong>
      </div>
      <CheckBubble on={task.done} label={t('common.done')} onClick={onToggle} />
    </article>
  )
}

export function TaskLayer({
  editing,
  viewId,
  recordId,
  deleteIds,
  onCloseEdit,
  onCloseView,
  onCloseRecord,
  onCloseDelete,
}: {
  editing: Task | 'new' | null
  viewId: string | null
  recordId: string | null
  deleteIds: string[] | null
  onCloseEdit: () => void
  onCloseView: () => void
  onCloseRecord: () => void
  onCloseDelete: () => void
}) {
  const tasks = useStore((state) => state.tasks)
  const view = tasks.find((item) => item.id === viewId) ?? null
  return (
    <>
      {editing ? <TaskEditor task={editing === 'new' ? null : editing} onClose={onCloseEdit} /> : null}
      {view ? <TaskDetail task={view} onClose={onCloseView} /> : null}
      {recordId ? <RecordDialog id={recordId} onClose={onCloseRecord} /> : null}
      {deleteIds ? <RepeatDelete ids={deleteIds} onClose={() => { onCloseDelete(); onCloseView() }} /> : null}
    </>
  )
}

function TaskEditor({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const categories = useStore((state) => state.categories)
  const tasks = useStore((state) => state.tasks)
  const addTask = useStore((state) => state.addTask)
  const updateTask = useStore((state) => state.updateTask)
  const fixed = Boolean(task?.fixedExpenseId)
  const fallback = categories.find((item) => item.id === 'todo.other') ?? categories.find((item) => item.kind === (fixed ? 'expense' : 'todo'))
  const [title, setTitle] = useState(task?.title ?? '')
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? fallback?.id ?? '')
  const [priority, setPriority] = useState<Priority | null>(task?.priority ?? null)
  const [dueDate, setDueDate] = useState<string | null>(task?.dueDate ?? null)
  const [dueTime, setDueTime] = useState<string | null>(task?.dueTime ?? null)
  const [repeat, setRepeat] = useState<RepeatKind | null>(task?.repeat ?? null)
  const [reminder, setReminder] = useState<ReminderKind>(task?.reminder ?? 'unset')
  const [tags, setTags] = useState<string[]>(task?.tags ?? [])
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? [])
  const [note, setNote] = useState(task?.note ?? '')
  const [sheet, setSheet] = useState<'category' | 'date' | 'repeat' | 'time' | 'reminder' | null>(null)
  const [addingSub, setAddingSub] = useState(false)
  const [sub, setSub] = useState('')
  const [editingSub, setEditingSub] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const today = todayISO()
  const category = categories.find((item) => item.id === categoryId)

  useEffect(() => {
    document.getElementById('task-title')?.focus()
  }, [])

  function save() {
    const cleaned = title.trim()
    if (!cleaned) return
    const id = task?.id ?? makeId()
    const next: Task = {
      id,
      title: cleaned.slice(0, 50),
      categoryId,
      priority,
      dueDate,
      dueTime,
      repeat: dueDate ? repeat : null,
      reminder: dueDate ? (reminder === 'unset' ? 'onTime' : reminder) : 'unset',
      tags,
      subtasks,
      note,
      done: task?.done ?? false,
      completedAt: task?.completedAt ?? null,
      board: task?.board ?? 'todo',
      boardPlaced: task?.boardPlaced ?? false,
      sortOrder: task?.sortOrder ?? nextSortOrder(tasks),
      createdAt: task?.createdAt ?? new Date().toISOString(),
      repeatSeriesId: repeat && dueDate ? (task?.repeatSeriesId ?? id) : null,
      fixedExpenseId: task?.fixedExpenseId ?? null,
    }
    if (task) updateTask(id, next)
    else addTask(next)
    onClose()
  }

  const repeatLabel = (() => {
    if (fixed && dueDate) return t('todo.monthlyDay', { day: Number(dueDate.slice(8, 10)) })
    if (!repeat || !dueDate) return t('todo.repeatOff')
    if (repeat === 'daily') return t('todo.repeatDaily')
    if (repeat === 'weekly') {
      const day = i18n.language.startsWith('en') ? weekdayLong(parseISODate(dueDate), i18n.language) : weekdayNarrow(parseISODate(dueDate), i18n.language)
      return t('todo.repeatWeekly', { day })
    }
    return t('todo.repeatMonthly', { day: Number(dueDate.slice(8, 10)) })
  })()

  const reminderLabel = !dueDate
    ? t('common.unset')
    : reminder === 'none'
      ? t('todo.remindNone')
      : reminder === 'hour'
        ? t('todo.remindHour')
        : reminder === 'day'
          ? t('todo.remindDay')
          : t('todo.remindOnTime')

  return (
    <BottomSheet open closeLabel={t('common.close')} onClose={onClose}>
      <SheetHeader
        closeLabel={t('common.close')}
        onClose={onClose}
        right={
          <button type="button" className="text-btn" disabled={!title.trim()} onClick={save}>
            {task ? t('common.save') : t('common.create')}
          </button>
        }
      />
      <div className="sheet-body editor">
        <button type="button" className="cat-launch" onClick={() => setSheet('category')}>
          <CategoryIcon id={category?.id ?? categoryId} emoji={category?.icon ?? '📌'} size={36} />
        </button>
        <input id="task-title" className="title-input" maxLength={50} value={title} placeholder={t('todo.newTask')} onChange={(event) => setTitle(event.target.value)} />
        <div className="prios">
          {(['high', 'medium', 'low'] as Priority[]).map((item) => (
            <button key={item} type="button" className={priority === item ? `prio ${item} on` : `prio ${item}`} aria-label={t(`priority.${item}`)} onClick={() => setPriority(priority === item ? null : item)} />
          ))}
        </div>
        <div className="card">
          <button type="button" className="row-btn" onClick={() => setSheet('date')}>
            <span>{repeat && dueDate ? t('todo.next') : t('common.date')}</span>
            <em>{repeat && dueDate ? formatMonthDay(parseISODate(dueDate), i18n.language) : dueText(dueDate, today, i18n.language, t('common.unset'), t('common.today'), t('common.tomorrow'))} ›</em>
          </button>
          {fixed ? (
            <div className="row-btn static"><span>{t('todo.repeat')}</span><em>{repeatLabel}</em></div>
          ) : (
            <button type="button" className="row-btn" onClick={() => setSheet('repeat')}>
              <span>{t('todo.repeat')}</span><em>{repeatLabel} ›</em>
            </button>
          )}
          <button type="button" className="row-btn" onClick={() => setSheet('time')}>
            <span>{t('todo.time')}</span><em>{dueTime ?? t('common.unset')} ›</em>
          </button>
          <button type="button" className="row-btn" onClick={() => setSheet('reminder')}>
            <span>{t('todo.reminder')}</span><em>{reminderLabel} ›</em>
          </button>
          <div className="row-btn static tags-row">
            <span>{t('todo.tags')}</span>
            <div className="chips">
              {tags.map((tag) => (
                <span key={tag} className="chip">{tag}<button type="button" onClick={() => setTags(tags.filter((item) => item !== tag))}>×</button></span>
              ))}
              {addingTag ? (
                <input
                  className="chip-input"
                  value={tagDraft}
                  autoFocus
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      const next = tagDraft.trim()
                      if (next && !tags.includes(next)) setTags([...tags, next])
                      setTagDraft('')
                      setAddingTag(false)
                    }
                  }}
                />
              ) : (
                <button type="button" className="chip add" onClick={() => setAddingTag(true)}>+</button>
              )}
            </div>
          </div>
        </div>
        <div className="card stack">
          {subtasks.map((item) => (
            <div key={item.id} className="sub-row">
              <button type="button" className="minus" onClick={() => setSubtasks(subtasks.filter((subtask) => subtask.id !== item.id))}>−</button>
              {editingSub === item.id ? (
                <input
                  className="field"
                  value={item.title}
                  autoFocus
                  onChange={(event) => setSubtasks(subtasks.map((subtask) => subtask.id === item.id ? { ...subtask, title: event.target.value } : subtask))}
                  onBlur={() => setEditingSub(null)}
                />
              ) : (
                <button type="button" className="sub-name" onClick={() => setEditingSub(item.id)}>{item.title}</button>
              )}
            </div>
          ))}
          {addingSub ? (
            <input
              className="field ghost-input"
              placeholder={t('todo.subtask')}
              value={sub}
              autoFocus
              onChange={(event) => setSub(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                const next = sub.trim()
                if (next) setSubtasks([...subtasks, { id: makeId(), title: next, done: false }])
                setSub('')
                setAddingSub(false)
              }}
            />
          ) : (
            <button type="button" className="text-btn left" onClick={() => setAddingSub(true)}>+ {t('todo.subtask')}</button>
          )}
        </div>
        <div className="card">
          <textarea className="textarea plain" placeholder={t('todo.note')} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
      <CategorySheet open={sheet === 'category'} kind={fixed ? 'expense' : 'todo'} onClose={() => setSheet(null)} onPick={setCategoryId} />
      <DateSheet
        open={sheet === 'date'}
        isNew={!task}
        value={dueDate}
        onClose={() => setSheet(null)}
        onChange={(next) => {
          setDueDate(next)
          if (!next) {
            setRepeat(null)
            setReminder('unset')
          } else if (reminder === 'unset') setReminder('onTime')
        }}
      />
      <RepeatSheet
        open={sheet === 'repeat'}
        value={repeat}
        dueDate={dueDate}
        onClose={() => setSheet(null)}
        onChange={(next) => {
          setRepeat(next)
          if (next && !dueDate) {
            setDueDate(today)
            if (reminder === 'unset') setReminder('onTime')
          }
        }}
      />
      <TimeSheet open={sheet === 'time'} value={dueTime} onClose={() => setSheet(null)} onChange={setDueTime} />
      <ReminderSheet open={sheet === 'reminder'} dueDate={dueDate} value={reminder} onClose={() => setSheet(null)} onChange={setReminder} />
    </BottomSheet>
  )
}

function DateSheet({ open, isNew, value, onClose, onChange }: { open: boolean; isNew: boolean; value: string | null; onClose: () => void; onChange: (value: string | null) => void }) {
  const { t, i18n } = useTranslation()
  const today = todayISO()
  const [cursor, setCursor] = useState(() => (value ? parseISODate(value) : new Date()))
  const now = new Date()
  const hidePrev = isNew && cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()
  const title = !value ? t('common.unset') : dueText(value, today, i18n.language, t('common.unset'), t('common.today'), t('common.tomorrow'))
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={title} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body">
        <Calendar cursor={cursor} onCursor={setCursor} selected={value} onSelect={onChange} minDate={isNew ? today : null} hidePrev={hidePrev} />
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => onChange(today)}>{t('common.today')}</button>
          <button type="button" className="btn ghost" onClick={() => onChange(isoDate(addDays(parseISODate(today), 1)))}>{t('common.tomorrow')}</button>
          <button type="button" className="btn ghost" onClick={() => onChange(null)}>{t('common.clear')}</button>
        </div>
      </div>
    </BottomSheet>
  )
}

function RepeatSheet({ open, value, dueDate, onClose, onChange }: { open: boolean; value: RepeatKind | null; dueDate: string | null; onClose: () => void; onChange: (value: RepeatKind | null) => void }) {
  const { t, i18n } = useTranslation()
  const anchor = dueDate ?? todayISO()
  const title = !value
    ? t('todo.repeatOff')
    : value === 'daily'
      ? t('todo.repeatDaily')
      : value === 'weekly'
        ? t('todo.repeatWeekly', { day: i18n.language.startsWith('en') ? weekdayLong(parseISODate(anchor), i18n.language) : weekdayNarrow(parseISODate(anchor), i18n.language) })
        : t('todo.repeatMonthly', { day: Number(anchor.slice(8, 10)) })
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={title} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body">
        <div className="card">
          <div className="row-btn static">
            <span>{t('todo.repeat')}</span>
            <Switch on={!!value} label={t('todo.repeat')} onClick={() => onChange(value ? null : 'daily')} />
          </div>
          {value ? (
            <>
              {(['daily', 'weekly', 'monthly'] as RepeatKind[]).map((item) => (
                <button key={item} type="button" className={value === item ? 'row-btn on' : 'row-btn'} onClick={() => onChange(item)}>
                  <span>{item === 'daily' ? t('todo.repeatDaily') : item === 'weekly' ? t('todo.repeatWeekly', { day: i18n.language.startsWith('en') ? weekdayLong(parseISODate(anchor), i18n.language) : weekdayNarrow(parseISODate(anchor), i18n.language) }) : t('todo.repeatMonthly', { day: Number(anchor.slice(8, 10)) })}</span>
                  {value === item ? <Icon name="check" size={18} /> : null}
                </button>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  )
}

function TimeSheet({ open, value, onClose, onChange }: { open: boolean; value: string | null; onClose: () => void; onChange: (value: string | null) => void }) {
  const { t } = useTranslation()
  const [hour, minute] = (value ?? '09:00').split(':')
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={value ?? t('todo.noTime')} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body">
        <div className="card">
          <div className="row-btn static">
            <span>{t('todo.dueTime')}</span>
            <Switch on={!!value} label={t('todo.dueTime')} onClick={() => onChange(value ? null : `${hour}:${minute}`)} />
          </div>
        </div>
        {value ? <TimeWheels hour={hour} minute={minute} onHour={(next) => onChange(`${next}:${minute}`)} onMinute={(next) => onChange(`${hour}:${next}`)} /> : null}
      </div>
    </BottomSheet>
  )
}

function ReminderSheet({ open, dueDate, value, onClose, onChange }: { open: boolean; dueDate: string | null; value: ReminderKind; onClose: () => void; onChange: (value: ReminderKind) => void }) {
  const { t } = useTranslation()
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'denied' : Notification.permission))
  const current = !dueDate ? t('todo.remindNeedDue') : value === 'none' ? t('todo.remindNone') : value === 'hour' ? t('todo.remindHour') : value === 'day' ? t('todo.remindDay') : t('todo.remindOnTime')
  const options: ReminderKind[] = ['none', 'onTime', 'hour', 'day']
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={current} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body stack">
        {dueDate ? options.map((item) => (
          <button key={item} type="button" className={value === item ? 'row-btn on' : 'row-btn'} onClick={() => onChange(item)}>
            <span>{item === 'none' ? t('todo.remindNone') : item === 'hour' ? t('todo.remindHour') : item === 'day' ? t('todo.remindDay') : t('todo.remindOnTime')}</span>
          </button>
        )) : <p className="muted">{t('todo.remindNeedDue')}</p>}
        {perm === 'denied' ? <p className="muted">{t('todo.noPermission')}</p> : null}
        {perm === 'default' ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void Notification.requestPermission().then((next) => setPerm(next))
            }}
          >
            {t('todo.allowNotify')}
          </button>
        ) : null}
      </div>
    </BottomSheet>
  )
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const categories = useStore((state) => state.categories)
  const fixedExpenses = useStore((state) => state.fixedExpenses)
  const toggleSubtask = useStore((state) => state.toggleSubtask)
  const deleteTask = useStore((state) => state.deleteTask)
  const [editing, setEditing] = useState(false)
  const [ask, setAsk] = useState(false)
  const category = categories.find((item) => item.id === task.categoryId)
  const fx = fixedExpenses.find((item) => item.id === task.fixedExpenseId)
  const parts: string[] = []
  if (task.dueDate) parts.push(`${formatMonthDay(parseISODate(task.dueDate), i18n.language)}${task.dueTime ? ` ${task.dueTime}` : ''}`)
  if (task.fixedExpenseId && task.dueDate) parts.push(t('todo.monthlyDay', { day: Number(task.dueDate.slice(8, 10)) }))
  else if (task.repeat === 'daily') parts.push(t('todo.repeatDaily'))
  else if (task.repeat === 'weekly' && task.dueDate) parts.push(t('todo.repeatWeekly', { day: i18n.language.startsWith('en') ? weekdayLong(parseISODate(task.dueDate), i18n.language) : weekdayNarrow(parseISODate(task.dueDate), i18n.language) }))
  else if (task.repeat === 'monthly' && task.dueDate) parts.push(t('todo.repeatMonthly', { day: Number(task.dueDate.slice(8, 10)) }))
  if (task.dueDate && task.reminder === 'hour') parts.push(t('todo.detailHour'))
  else if (task.dueDate && task.reminder === 'day') parts.push(t('todo.detailDay'))
  else if (task.dueDate && task.reminder === 'none') parts.push(t('todo.detailNone'))
  else if (task.dueDate) parts.push(t('todo.detailOnTime'))
  if (category) parts.push(displayName(category, t))
  if (task.priority) parts.push(t(`priority.${task.priority}`))
  if (fx) parts.push(formatHKD(fx.amount))
  if (task.note) parts.push(task.note)

  return (
    <>
      <Dialog open title={task.title} body={parts.join(t('todo.detailSep'))} onClose={onClose} closeLabel={t('common.close')}>
        {task.subtasks.length ? (
          <div className="card">
            {task.subtasks.map((item) => (
              <button key={item.id} type="button" className="row-btn" onClick={() => toggleSubtask(task.id, item.id)}>
                <CheckBubble on={item.done} label={item.title} onClick={() => toggleSubtask(task.id, item.id)} />
                <span className={item.done ? 'done-title' : ''}>{item.title}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="quick-row">
          <button type="button" className="btn primary" onClick={() => setEditing(true)}>{t('common.edit')}</button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              if (task.repeat && !task.fixedExpenseId) setAsk(true)
              else {
                deleteTask(task.id, 'single')
                onClose()
              }
            }}
          >
            {t('common.delete')}
          </button>
        </div>
      </Dialog>
      {editing ? <TaskEditor task={task} onClose={() => { setEditing(false); onClose() }} /> : null}
      {ask ? <RepeatDelete ids={[task.id]} onClose={() => { setAsk(false); onClose() }} /> : null}
    </>
  )
}

function RecordDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation()
  const task = useStore((state) => state.tasks.find((item) => item.id === id))
  const fx = useStore((state) => state.fixedExpenses.find((item) => item.id === task?.fixedExpenseId))
  const settleFixed = useStore((state) => state.settleFixed)
  if (!task || !fx) return null
  return (
    <Dialog open title={t('todo.recordTitle')} body={task.title} onClose={onClose} closeLabel={t('common.close')}>
      <p className="money">{formatHKD(fx.amount)}</p>
      <div className="stack">
        <button type="button" className="btn primary" onClick={() => { settleFixed(id, 'record'); onClose() }}>{t('todo.recordYes')}</button>
        <button type="button" className="btn ghost" onClick={() => { settleFixed(id, 'skip'); onClose() }}>{t('todo.recordNo')}</button>
      </div>
    </Dialog>
  )
}

function RepeatDelete({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { t } = useTranslation()
  const tasks = useStore((state) => state.tasks)
  const deleteTask = useStore((state) => state.deleteTask)
  function run(mode: 'single' | 'future') {
    ids.forEach((id) => {
      const task = tasks.find((item) => item.id === id)
      if (!task) return
      deleteTask(id, task.repeat && !task.fixedExpenseId ? mode : 'single')
    })
    onClose()
  }
  return (
    <Dialog open title={t('common.delete')} onClose={onClose} closeLabel={t('common.close')}>
      <div className="stack">
        <button type="button" className="btn primary" onClick={() => run('single')}>{t('todo.thisOnly')}</button>
        <button type="button" className="btn danger" onClick={() => run('future')}>{t('todo.andFuture')}</button>
      </div>
    </Dialog>
  )
}
