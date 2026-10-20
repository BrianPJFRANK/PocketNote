import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, CategoryKind } from '../domain/types.ts'
import { ICON_CHOICES } from '../domain/icons.ts'
import { displayName } from '../lib/label.ts'
import { categoryUseCount, useStore } from '../store/useStore.ts'
import { CategoryIcon } from './CategoryIcon.tsx'
import { BottomSheet, SearchField, SheetHeader } from './Overlay.tsx'

export function CategorySheet({
  open,
  onClose,
  kind,
  onPick,
  createOnly = false,
}: {
  open: boolean
  onClose: () => void
  kind: CategoryKind
  onPick: (id: string) => void
  createOnly?: boolean
}) {
  const { t } = useTranslation()
  const categories = useStore((state) => state.categories)
  const transactions = useStore((state) => state.transactions)
  const tasks = useStore((state) => state.tasks)
  const fixedExpenses = useStore((state) => state.fixedExpenses)
  const addCategory = useStore((state) => state.addCategory)
  const renameCategory = useStore((state) => state.renameCategory)
  const deleteCategory = useStore((state) => state.deleteCategory)
  const reassignCategory = useStore((state) => state.reassignCategory)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(ICON_CHOICES[0])
  const [managing, setManaging] = useState<Category | null>(null)
  const [rename, setRename] = useState('')
  const [moveTo, setMoveTo] = useState<string | null>(null)
  const held = useRef(false)
  useEffect(() => {
    if (!open || !createOnly) return
    setCreating(false)
    setName('')
    setIcon(ICON_CHOICES[0])
  }, [open, createOnly])
  const list = categories.filter((item) => item.kind === kind)
  const visible = list.filter((item) => displayName(item, t).toLowerCase().includes(query.trim().toLowerCase()))
  const used = managing ? categoryUseCount(managing.id, { transactions, tasks, fixedExpenses }) : 0
  const others = useMemo(() => list.filter((item) => item.id !== managing?.id), [list, managing])

  function closeManage() {
    setManaging(null)
    setMoveTo(null)
  }

  return (
    <>
      <BottomSheet
        open={open}
        closeLabel={t('common.close')}
        onClose={() => {
          setCreating(false)
          onClose()
        }}
      >
        <SheetHeader title={createOnly ? t('ledger.addCategory') : t('todo.chooseCategory')} closeLabel={t('common.close')} onClose={onClose} />
        <div className="sheet-body">
          {createOnly ? null : <SearchField value={query} onChange={setQuery} placeholder={t('todo.searchCategory')} />}
          {createOnly || creating ? (
            <div className="card stack">
              <input className="field" value={name} placeholder={t('common.name')} onChange={(event) => setName(event.target.value)} />
              <div className="icon-picks">
                {ICON_CHOICES.map((item) => (
                  <button key={item} type="button" className={item === icon ? 'icon-pick on' : 'icon-pick'} onClick={() => setIcon(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={!name.trim()}
                onClick={() => {
                  const created = addCategory(kind, name, icon)
                  setCreating(false)
                  setName('')
                  onPick(created.id)
                  onClose()
                }}
              >
                {t('common.add')}
              </button>
            </div>
          ) : null}
          {createOnly ? null : <div className="grid-3">
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                className="mini-card cat-card"
                onClick={() => {
                  if (held.current) {
                    held.current = false
                    return
                  }
                  onPick(item.id)
                  onClose()
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  held.current = true
                  setManaging(item)
                  setRename(displayName(item, t))
                }}
                onPointerDown={() => {
                  held.current = false
                  const timer = window.setTimeout(() => {
                    held.current = true
                    setManaging(item)
                    setRename(displayName(item, t))
                  }, 480)
                  const clear = () => window.clearTimeout(timer)
                  window.addEventListener('pointerup', clear, { once: true })
                  window.addEventListener('pointercancel', clear, { once: true })
                }}
              >
                <CategoryIcon id={item.id} emoji={item.icon} size={44} />
                <span>{displayName(item, t)}</span>
              </button>
            ))}
            <button type="button" className="mini-card cat-card" onClick={() => setCreating(true)}>
              <span className="cat-ico">+</span>
              <span>{t('common.add')}</span>
            </button>
          </div>}
        </div>
      </BottomSheet>
      <BottomSheet open={!!managing} onClose={closeManage} closeLabel={t('common.close')}>
        {managing ? (
          <>
            <SheetHeader title={t('todo.manage')} closeLabel={t('common.close')} onClose={closeManage} />
            <div className="sheet-body stack">
              <label className="stack">
                <span className="muted">{t('todo.rename')}</span>
                <input className="field" value={rename} onChange={(event) => setRename(event.target.value)} />
              </label>
              <button
                type="button"
                className="btn primary"
                disabled={!rename.trim()}
                onClick={() => {
                  renameCategory(managing.id, rename)
                  closeManage()
                }}
              >
                {t('common.save')}
              </button>
              {used > 0 ? (
                <div className="card stack">
                  <p>{kind === 'todo' ? t('todo.categoryInUse') : t('ledger.categoryInUse')}</p>
                  {others.map((item) => (
                    <button key={item.id} type="button" className={moveTo === item.id ? 'row-btn on' : 'row-btn'} onClick={() => setMoveTo(item.id)}>
                      <CategoryIcon id={item.id} emoji={item.icon} size={24} />
                      <span>{displayName(item, t)}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn danger"
                    disabled={!moveTo}
                    onClick={() => {
                      if (!moveTo) return
                      reassignCategory(managing.id, moveTo)
                      closeManage()
                    }}
                  >
                    {t('ledger.pickCategory')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    deleteCategory(managing.id)
                    closeManage()
                  }}
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </>
        ) : null}
      </BottomSheet>
    </>
  )
}
