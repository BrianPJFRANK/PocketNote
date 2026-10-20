import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Memo } from '../../domain/types.ts'
import { Icon, MenuButton } from '../../components/Icon.tsx'
import { BottomSheet, EmptyState, PopMenu, SearchField, SheetHeader } from '../../components/Overlay.tsx'
import { formatStamp, isoDate, todayISO } from '../../lib/date.ts'
import { useFab } from '../../lib/useFab.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'

type SortMode = 'updated' | 'created' | 'title'

export function MemoListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setDrawer = useUi((state) => state.setDrawer)
  const memos = useStore((state) => state.memos)
  const trashMemos = useStore((state) => state.trashMemos)
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('updated')
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const alive = memos.filter((memo) => !memo.deletedAt)
  const trashCount = memos.filter((memo) => memo.deletedAt).length
  useFab(!picking, () => navigate('/memo/new'))
  const usedCategories = [...new Set(alive.flatMap((memo) => memo.categories))]
  const usedTags = [...new Set(alive.flatMap((memo) => memo.tags))]
  const filtered = alive.filter((memo) => {
    const needle = query.trim().toLowerCase()
    if (needle && !`${memo.title}\n${memo.body}`.toLowerCase().includes(needle)) return false
    if (categories.length && !memo.categories.some((item) => categories.includes(item))) return false
    if (tags.length && !memo.tags.some((item) => tags.includes(item))) return false
    return true
  })
  const pinned = sortMemos(filtered.filter((memo) => memo.pinned), sortMode, i18n.language)
  const rest = filtered.filter((memo) => !memo.pinned)
  const groups = groupMemos(rest, sortMode, i18n.language)
  const empty = !alive.length
  const noMatch = !empty && !filtered.length

  return (
    <div className="page">
      <div className="page-head">
        <MenuButton label={t('nav.openMenu')} onClick={() => setDrawer(true)} />
        <strong className="head-title">{t('nav.memo')}</strong>
        <button type="button" className="text-btn" onClick={() => navigate('/memo/trash')}>
          {t('memo.trash')}{trashCount ? ` ${t('memo.count', { count: trashCount })}` : ''}
        </button>
      </div>
      <SearchField value={query} onChange={setQuery} placeholder={t('common.search')} />
      <div className="tool-row end">
        {picking ? (
          <button type="button" className="text-btn" onClick={() => { setPicking(false); setPicked([]) }}>{t('common.done')}</button>
        ) : (
          <button type="button" className="text-btn" onClick={() => setPicking(true)}>{t('todo.multi')}</button>
        )}
        <button type="button" className="text-btn" onClick={() => setFilterOpen(true)}>{t('memo.filter')}</button>
        <div className="menu-anchor">
          <button type="button" className="text-btn" onClick={() => setSortOpen((open) => !open)}>{t('todo.sort')}</button>
          <PopMenu open={sortOpen} onClose={() => setSortOpen(false)} label={t('common.close')}>
            <button type="button" className="menu-item" onClick={() => { setSortMode('updated'); setSortOpen(false) }}>{t('memo.sortUpdated')}</button>
            <button type="button" className="menu-item" onClick={() => { setSortMode('created'); setSortOpen(false) }}>{t('memo.sortCreated')}</button>
            <button type="button" className="menu-item" onClick={() => { setSortMode('title'); setSortOpen(false) }}>{t('memo.sortTitle')}</button>
          </PopMenu>
        </div>
      </div>
      {empty || noMatch ? <EmptyState pose="memo-empty" text={noMatch ? t('memo.noMatch') : t('memo.empty')} compact={noMatch} /> : (
        <>
          {pinned.length ? <MemoGroup title={t('memo.pinned')} memos={pinned} locale={i18n.language} picking={picking} picked={picked} onPick={(id) => setPicked(toggle(picked, id))} /> : null}
          {groups.map((group) => (
            <MemoGroup key={group.key} title={t(group.label)} memos={group.memos} locale={i18n.language} picking={picking} picked={picked} onPick={(id) => setPicked(toggle(picked, id))} />
          ))}
        </>
      )}
      {picking ? (
        <div className="selectbar">
          <span>{t('memo.selected', { count: picked.length })}</span>
          <button type="button" className="btn danger" disabled={!picked.length} onClick={() => { trashMemos(picked); setPicked([]); setPicking(false) }}>{t('common.delete')}</button>
        </div>
      ) : null}
      <FilterMemo open={filterOpen} categories={usedCategories} tags={usedTags} selectedCategories={categories} selectedTags={tags} onClose={() => setFilterOpen(false)} onApply={(nextCategories, nextTags) => { setCategories(nextCategories); setTags(nextTags) }} />
    </div>
  )
}

function MemoGroup({ title, memos, locale, picking, picked, onPick }: { title: string; memos: Memo[]; locale: string; picking: boolean; picked: string[]; onPick: (id: string) => void }) {
  const navigate = useNavigate()
  return (
    <section>
      <h3 className="group-label">{title}</h3>
      <div className="memo-grid">
        {memos.map((memo) => (
          <button key={memo.id} type="button" className="memo-card" onClick={() => (picking ? onPick(memo.id) : navigate(`/memo/edit/${memo.id}`))}>
            {picking ? <span className={picked.includes(memo.id) ? 'tick on' : 'tick'}>{picked.includes(memo.id) ? <Icon name="check" size={14} /> : null}</span> : null}
            {memo.pinned ? <Icon name="pin" size={16} /> : null}
            <strong>{memo.title || ' '}</strong>
            <p>{memo.body.split('\n').find((line) => line.trim()) ?? ''}</p>
            <em>{formatStamp(memo.updatedAt, locale)}</em>
          </button>
        ))}
      </div>
    </section>
  )
}

function FilterMemo({
  open,
  categories,
  tags,
  selectedCategories,
  selectedTags,
  onClose,
  onApply,
}: {
  open: boolean
  categories: string[]
  tags: string[]
  selectedCategories: string[]
  selectedTags: string[]
  onClose: () => void
  onApply: (categories: string[], tags: string[]) => void
}) {
  const { t } = useTranslation()
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={t('memo.filter')} onClose={onClose} closeLabel={t('common.close')} />
      {open ? (
        <FilterFields
          key={`${selectedCategories.join('\0')}|${selectedTags.join('\0')}`}
          categories={categories}
          tags={tags}
          selectedCategories={selectedCategories}
          selectedTags={selectedTags}
          onClose={onClose}
          onApply={onApply}
        />
      ) : null}
    </BottomSheet>
  )
}

function FilterFields({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  onClose,
  onApply,
}: {
  categories: string[]
  tags: string[]
  selectedCategories: string[]
  selectedTags: string[]
  onClose: () => void
  onApply: (categories: string[], tags: string[]) => void
}) {
  const { t } = useTranslation()
  const [cats, setCats] = useState(selectedCategories)
  const [chosen, setChosen] = useState(selectedTags)
  function toggleList(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }
  return (
      <div className="sheet-body stack">
        <h3>{t('memo.categories')}</h3>
        {categories.length ? <div className="chips">{categories.map((item) => <button key={item} type="button" className={cats.includes(item) ? 'chip on' : 'chip'} onClick={() => setCats(toggleList(cats, item))}>{item}</button>)}</div> : <p className="muted">{t('memo.noAdded')}</p>}
        <h3>{t('memo.tags')}</h3>
        {tags.length ? <div className="chips">{tags.map((item) => <button key={item} type="button" className={chosen.includes(item) ? 'chip on' : 'chip'} onClick={() => setChosen(toggleList(chosen, item))}>{item}</button>)}</div> : <p className="muted">{t('memo.noAdded')}</p>}
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => { setCats([]); setChosen([]); onApply([], []) ; onClose() }}>{t('common.clear')}</button>
          <button type="button" className="btn primary" onClick={() => { onApply(cats, chosen); onClose() }}>{t('common.apply')}</button>
        </div>
      </div>
  )
}

function sortMemos(memos: Memo[], mode: SortMode, locale: string): Memo[] {
  return [...memos].sort((a, b) => {
    if (mode === 'title') return a.title.localeCompare(b.title, locale)
    if (mode === 'created') return b.createdAt.localeCompare(a.createdAt)
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

function groupMemos(memos: Memo[], mode: SortMode, locale: string): { key: string; label: string; memos: Memo[] }[] {
  const today = todayISO()
  const yesterday = isoDate(new Date(Date.now() - 86_400_000))
  const weekEdge = isoDate(new Date(Date.now() - 7 * 86_400_000))
  const buckets = [
    { key: 'today', label: 'common.today', memos: [] as Memo[] },
    { key: 'yesterday', label: 'common.yesterday', memos: [] as Memo[] },
    { key: 'week', label: 'memo.past7', memos: [] as Memo[] },
    { key: 'earlier', label: 'memo.earlier', memos: [] as Memo[] },
  ]
  memos.forEach((memo) => {
    const day = memo.updatedAt.slice(0, 10)
    if (day === today) buckets[0].memos.push(memo)
    else if (day === yesterday) buckets[1].memos.push(memo)
    else if (day >= weekEdge) buckets[2].memos.push(memo)
    else buckets[3].memos.push(memo)
  })
  return buckets.filter((bucket) => bucket.memos.length).map((bucket) => ({ ...bucket, memos: sortMemos(bucket.memos, mode, locale) }))
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
}
