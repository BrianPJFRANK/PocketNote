import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../components/Icon.tsx'
import { Dialog, EmptyState } from '../../components/Overlay.tsx'
import { useStore } from '../../store/useStore.ts'

export function TrashPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const memos = useStore((state) => state.memos)
  const restoreMemo = useStore((state) => state.restoreMemo)
  const destroyMemo = useStore((state) => state.destroyMemo)
  const purgeTrash = useStore((state) => state.purgeTrash)
  const [pending, setPending] = useState<string | null>(null)
  const trashed = memos.filter((memo) => memo.deletedAt)
  useEffect(() => {
    purgeTrash()
  }, [purgeTrash])

  return (
    <div className="page">
      <div className="page-head">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate('/memo')}><Icon name="back" /></button>
        <strong className="head-title">{t('memo.trash')}</strong>
        <span className="icon-spacer" />
      </div>
      <p className="muted">{t('memo.keep')}</p>
      {trashed.length ? trashed.map((memo) => {
        const left = Math.max(0, 30 - Math.floor((Date.now() - new Date(memo.deletedAt ?? 0).getTime()) / 86_400_000))
        return (
          <div key={memo.id} className="budget-line">
            <span><strong>{memo.title || t('memo.title')}</strong><em>{t('memo.remaining', { count: left })}</em></span>
            <button type="button" className="text-btn" onClick={() => restoreMemo(memo.id)}>{t('memo.restore')}</button>
            <button type="button" className="text-btn" onClick={() => setPending(memo.id)}>{t('common.clear')}</button>
          </div>
        )
      }) : <EmptyState pose="trash-empty" text={t('memo.trashEmpty')} />}
      <Dialog open={!!pending} title={t('common.clear')} body={t('memo.purgeAsk')} onClose={() => setPending(null)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setPending(null)}>{t('common.cancel')}</button>
          <button type="button" className="btn danger" onClick={() => { if (pending) destroyMemo(pending); setPending(null) }}>{t('common.clear')}</button>
        </div>
      </Dialog>
    </div>
  )
}
