import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon.tsx'
import { BottomSheet, PopMenu, SheetHeader } from '../../components/Overlay.tsx'
import { useStore } from '../../store/useStore.ts'

export function MemoEditPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const memos = useStore((state) => state.memos)
  const addMemo = useStore((state) => state.addMemo)
  const updateMemo = useStore((state) => state.updateMemo)
  const trashMemos = useStore((state) => state.trashMemos)
  const destroyMemo = useStore((state) => state.destroyMemo)
  const existing = memos.find((memo) => memo.id === id)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [more, setMore] = useState(false)
  const [sheet, setSheet] = useState(false)
  const created = useRef<string | null>(id && id !== 'new' ? id : null)
  const bornHere = useRef(!id)
  const titleRef = useRef(title)
  const bodyRef = useRef(body)
  titleRef.current = title
  bodyRef.current = body
  const dirty = useRef(false)

  useEffect(() => {
    return () => {
      if (bornHere.current && created.current && !titleRef.current.trim() && !bodyRef.current.trim()) destroyMemo(created.current)
    }
  }, [destroyMemo])

  useEffect(() => {
    if (!dirty.current) return
    if (!title.trim() && !body.trim()) return
    if (!created.current) {
      const memo = addMemo({ title, body })
      created.current = memo.id
      navigate(`/memo/edit/${memo.id}`, { replace: true })
      return
    }
    updateMemo(created.current, { title, body })
  }, [title, body, addMemo, updateMemo, navigate])

  const current = memos.find((memo) => memo.id === (created.current ?? id)) ?? existing
  const words = [...body].length

  return (
    <div className="page editor-page">
      <div className="page-head">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate('/memo')}><Icon name="back" /></button>
        <span className="grow" />
        <button type="button" className={current?.pinned ? 'icon-btn on' : 'icon-btn'} aria-label={t('memo.pinned')} onClick={() => { if (current) updateMemo(current.id, { pinned: !current.pinned }) }}>
          <Icon name="pin" />
        </button>
        <div className="menu-anchor">
          <button type="button" className="icon-btn" aria-label={t('common.more')} onClick={() => setMore((open) => !open)}><Icon name="more" /></button>
          <PopMenu open={more} onClose={() => setMore(false)} label={t('common.close')}>
            <button type="button" className="menu-item" onClick={() => { setMore(false); setSheet(true) }}>{t('memo.sheet')}</button>
            <button type="button" className="menu-item" onClick={() => { if (current) trashMemos([current.id]); navigate('/memo') }}>{t('common.delete')}</button>
          </PopMenu>
        </div>
      </div>
      <input className="title-input" value={title} placeholder={t('memo.title')} onChange={(event) => { dirty.current = true; setTitle(event.target.value) }} />
      <textarea className="body-input" value={body} placeholder={t('memo.write')} onChange={(event) => { dirty.current = true; setBody(event.target.value) }} />
      <div className="wordbar">{t('memo.words', { count: words })}</div>
      {current ? <TagSheet memoId={current.id} open={sheet} onClose={() => setSheet(false)} /> : null}
    </div>
  )
}

function TagSheet({ memoId, open, onClose }: { memoId: string; open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const memo = useStore((state) => state.memos.find((item) => item.id === memoId))
  const updateMemo = useStore((state) => state.updateMemo)
  const [category, setCategory] = useState('')
  const [tag, setTag] = useState('')
  if (!memo) return null
  function add(kind: 'categories' | 'tags', value: string) {
    const next = value.trim()
    if (!next || memo![kind].includes(next)) return
    updateMemo(memoId, { [kind]: [...memo![kind], next] })
  }
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t('common.close')}>
      <SheetHeader title={t('memo.sheet')} onClose={onClose} closeLabel={t('common.close')} />
      <div className="sheet-body stack">
        <h3>{t('memo.categories')}</h3>
        <div className="chips">
          {memo.categories.map((item) => <span key={item} className="chip">{item}<button type="button" onClick={() => updateMemo(memoId, { categories: memo.categories.filter((entry) => entry !== item) })}>×</button></span>)}
          <input className="chip-input" value={category} placeholder="+" onChange={(event) => setCategory(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { add('categories', category); setCategory('') } }} />
        </div>
        <h3>{t('memo.tags')}</h3>
        <div className="chips">
          {memo.tags.map((item) => <span key={item} className="chip">{item}<button type="button" onClick={() => updateMemo(memoId, { tags: memo.tags.filter((entry) => entry !== item) })}>×</button></span>)}
          <input className="chip-input" value={tag} placeholder="+" onChange={(event) => setTag(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { add('tags', tag); setTag('') } }} />
        </div>
      </div>
    </BottomSheet>
  )
}
