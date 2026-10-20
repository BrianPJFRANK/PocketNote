import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Locale, ModuleId } from '../../domain/types.ts'
import { Icon } from '../../components/Icon.tsx'
import { Mascot } from '../../components/Mascot.tsx'
import { BottomSheet, Dialog, SheetHeader } from '../../components/Overlay.tsx'
import { Switch } from '../../components/Icon.tsx'
import { biometricAvailable, registerBiometric } from '../../lib/biometric.ts'
import { toCsv, toWorkbook, type ExportTable } from '../../lib/exportFile.ts'
import { downloadBlob } from '../../lib/download.ts'
import { sha256 } from '../../lib/hash.ts'
import { displayName } from '../../lib/label.ts'
import { formatStamp } from '../../lib/date.ts'
import { modulePath } from '../../lib/routes.ts'
import { SessionContext } from '../../session.ts'
import { useStore } from '../../store/useStore.ts'
import { useUi } from '../../store/ui.ts'

const locales: Locale[] = ['zh-TW', 'zh-CN', 'en']
const modules: ModuleId[] = ['todo', 'ledger', 'memo']

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const back = (location.state as { back?: string } | null)?.back
  const session = useContext(SessionContext)
  const settings = useStore((state) => state.settings)
  const setLocale = useStore((state) => state.setLocale)
  const setDefaultModule = useStore((state) => state.setDefaultModule)
  const enableLock = useStore((state) => state.enableLock)
  const disableLock = useStore((state) => state.disableLock)
  const setPasswordHash = useStore((state) => state.setPasswordHash)
  const setBiometric = useStore((state) => state.setBiometric)
  const setGoogleEmail = useStore((state) => state.setGoogleEmail)
  const backups = useStore((state) => state.backups)
  const createBackup = useStore((state) => state.createBackup)
  const restoreBackup = useStore((state) => state.restoreBackup)
  const transactions = useStore((state) => state.transactions)
  const tasks = useStore((state) => state.tasks)
  const memos = useStore((state) => state.memos)
  const categories = useStore((state) => state.categories)
  const accounts = useStore((state) => state.accounts)
  const showToast = useUi((state) => state.showToast)
  const blink = useUi((state) => state.blink)
  const flashBlink = useUi((state) => state.flashBlink)
  const [sheet, setSheet] = useState<'lang' | 'home' | 'backup' | 'signin' | null>(null)
  const [lockMode, setLockMode] = useState<'enable' | 'disable' | 'change' | null>(null)
  const [bioOk, setBioOk] = useState(true)
  const [askBackup, setAskBackup] = useState(false)
  const [restoreId, setRestoreId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [email, setEmail] = useState('')
  const [afterLogin, setAfterLogin] = useState<'backup' | 'restore' | null>(null)

  useEffect(() => {
    void biometricAvailable().then(setBioOk)
  }, [])

  function signIn(next: 'backup' | 'restore' | null) {
    setAfterLogin(next)
    setSheet('signin')
  }

  function tables(): ExportTable[] {
    const txRows = transactions.map((tx) => {
      const category = categories.find((item) => item.id === tx.categoryId)
      const account = accounts.find((item) => item.id === tx.accountId)
      return [tx.type, String(tx.amount), tx.date, category ? displayName(category, t) : '', account ? displayName(account, t) : '', tx.note]
    })
    const taskRows = tasks.map((task) => [task.title, task.dueDate ?? '', task.done ? '1' : '0', task.note])
    const memoRows = memos.filter((memo) => !memo.deletedAt).map((memo) => [memo.title, memo.body, memo.pinned ? '1' : '0', memo.categories.join('|'), memo.tags.join('|')])
    return [
      { name: t('nav.ledger'), headers: [t('common.category'), t('common.amount'), t('common.date'), t('common.category'), t('common.account'), t('common.note')], rows: txRows },
      { name: t('nav.todo'), headers: [t('common.name'), t('common.date'), t('common.done'), t('common.note')], rows: taskRows },
      { name: t('nav.memo'), headers: [t('memo.title'), t('memo.write'), t('memo.pinned'), t('memo.categories'), t('memo.tags')], rows: memoRows },
    ]
  }

  function exportFile(kind: 'csv' | 'xls' | 'json') {
    const data = tables()
    const note = t('settings.emptyFile')
    if (kind === 'json') {
      const empty = transactions.length + tasks.length + memos.filter((memo) => !memo.deletedAt).length === 0
      downloadBlob('pocketnote.json', new Blob([JSON.stringify({ transactions, tasks, memos, empty: empty ? note : null }, null, 2)], { type: 'application/json' }))
    } else if (kind === 'csv') {
      downloadBlob('pocketnote.csv', new Blob([toCsv(data, note)], { type: 'text/csv;charset=utf-8' }))
    } else {
      downloadBlob('pocketnote.xls', new Blob([toWorkbook(data, note)], { type: 'application/vnd.ms-excel' }))
    }
    showToast(t('common.saved'))
  }

  const moduleLabel: Record<ModuleId, string> = { todo: t('nav.todo'), ledger: t('nav.ledger'), memo: t('nav.memo') }

  return (
    <div className="page">
      <div className="page-head">
        <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate(back || modulePath(settings.defaultModule))}><Icon name="back" /></button>
        <strong className="head-title">{t('settings.title')}</strong>
        <span className="icon-spacer" />
      </div>
      <div className="settings-mascot"><Mascot pose={blink ? 'blink' : 'bust'} size="sm" /></div>
      <section className="card">
        <button type="button" className="row-btn" onClick={() => setSheet('lang')}><span>{t('settings.language')}</span><em>{t(`lang.${settings.locale}`)} ›</em></button>
      </section>
      <section className="card">
        <button type="button" className="row-btn" onClick={() => setSheet('home')}><span>{t('settings.defaultHome')}</span><em>{moduleLabel[settings.defaultModule]} ›</em></button>
      </section>
      <section className="card">
        <div className="row-btn static">
          <span>{t('settings.lock')}</span>
          <Switch on={settings.appLockEnabled} label={t('settings.lock')} onClick={() => setLockMode(settings.appLockEnabled ? 'disable' : 'enable')} />
        </div>
        {settings.appLockEnabled ? (
          <>
            <button type="button" className="row-btn" onClick={() => setLockMode('change')}><span>{t('settings.changePassword')}</span><em>›</em></button>
            <div className="row-btn static">
              <span>{bioOk ? t('settings.biometric') : t('settings.noBiometric')}</span>
              <Switch
                on={settings.biometricEnabled}
                disabled={!bioOk}
                label={t('settings.biometric')}
                onClick={() => {
                  if (!bioOk) return
                  if (settings.biometricEnabled) setBiometric(false, null)
                  else {
                    void registerBiometric().then((credentialId) => {
                      if (!credentialId) setBioOk(false)
                      else setBiometric(true, credentialId)
                    })
                  }
                }}
              />
            </div>
          </>
        ) : null}
      </section>
      <section className="card stack">
        <h3>{t('settings.backup')}</h3>
        <p className="muted">{t('settings.backupBody')}</p>
        <p className="muted">{t('settings.backupLocal')}</p>
        <button type="button" className="row-btn" onClick={() => (settings.googleEmail ? setSheet(null) : signIn(null))}>
          <span>{t('settings.account')}</span>
          <em>{settings.googleEmail ?? t('settings.signedOut')} ›</em>
        </button>
        {settings.googleEmail ? <button type="button" className="text-btn left" onClick={() => setGoogleEmail(null)}>{t('settings.signOut')}</button> : null}
        <button type="button" className="row-btn" onClick={() => (settings.googleEmail ? setAskBackup(true) : signIn('backup'))}><span>{t('settings.backupAction')}</span><em>›</em></button>
        <button type="button" className="row-btn" onClick={() => {
          if (!settings.googleEmail) signIn('restore')
          else if (!backups.length) setNotice(t('settings.noBackup'))
          else setSheet('backup')
        }}><span>{t('settings.restore')}</span><em>›</em></button>
        {notice ? <p className="error">{notice}</p> : null}
      </section>
      <section className="card">
        <h3 className="pad-title">{t('settings.export')}</h3>
        <p className="muted pad-copy">{t('settings.exportBody')}</p>
        <button type="button" className="row-btn" onClick={() => exportFile('csv')}><span>{t('settings.csv')}</span><em>›</em></button>
        <button type="button" className="row-btn" onClick={() => exportFile('xls')}><span>{t('settings.excel')}</span><em>›</em></button>
        <button type="button" className="row-btn" onClick={() => exportFile('json')}><span>{t('settings.json')}</span><em>›</em></button>
      </section>
      <BottomSheet open={sheet === 'lang' || sheet === 'home'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={sheet === 'lang' ? t('settings.language') : t('settings.defaultHome')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <div className="sheet-body">
          {sheet === 'lang' ? locales.map((item) => (
            <button key={item} type="button" className={settings.locale === item ? 'row-btn on' : 'row-btn'} onClick={() => { setLocale(item); setSheet(null) }}>
              <span>{t(`lang.${item}`)}</span>{settings.locale === item ? <Icon name="check" size={18} /> : null}
            </button>
          )) : modules.map((item) => (
            <button key={item} type="button" className={settings.defaultModule === item ? 'row-btn on' : 'row-btn'} onClick={() => { setDefaultModule(item); setSheet(null) }}>
              <span>{moduleLabel[item]}</span>{settings.defaultModule === item ? <Icon name="check" size={18} /> : null}
            </button>
          ))}
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'signin'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('ledger.authTitle')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <form className="sheet-body stack" onSubmit={(event) => {
          event.preventDefault()
          if (!email.includes('@')) return
          setGoogleEmail(email.trim())
          setSheet(null)
          if (afterLogin === 'backup') setAskBackup(true)
          if (afterLogin === 'restore') {
            if (!backups.length) setNotice(t('settings.noBackup'))
            else setSheet('backup')
          }
        }}>
          <input className="field" type="email" value={email} placeholder={t('ledger.email')} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" className="btn primary">{t('ledger.signIn')}</button>
        </form>
      </BottomSheet>
      <BottomSheet open={sheet === 'backup'} onClose={() => setSheet(null)} closeLabel={t('common.close')}>
        <SheetHeader title={t('settings.pickBackup')} onClose={() => setSheet(null)} closeLabel={t('common.close')} />
        <div className="sheet-body">
          {backups.map((item) => (
            <button key={item.id} type="button" className="row-btn" onClick={() => setRestoreId(item.id)}>
              <span>{formatStamp(item.createdAt, i18n.language)}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
      <Dialog open={askBackup} title={t('settings.backupAction')} body={t('settings.backupAsk')} onClose={() => setAskBackup(false)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setAskBackup(false)}>{t('common.cancel')}</button>
          <button type="button" className="btn primary" onClick={() => { createBackup(); setAskBackup(false); flashBlink() }}>{t('common.confirm')}</button>
        </div>
      </Dialog>
      <Dialog open={!!restoreId} title={t('settings.restore')} body={t('settings.restoreAsk')} onClose={() => setRestoreId(null)} closeLabel={t('common.cancel')}>
        <div className="quick-row">
          <button type="button" className="btn ghost" onClick={() => setRestoreId(null)}>{t('common.cancel')}</button>
          <button type="button" className="btn primary" onClick={() => {
            if (!restoreId) return
            const restored = restoreBackup(restoreId)
            setRestoreId(null)
            session?.unlock()
            flashBlink()
            if (restored) navigate(modulePath(restored.defaultModule), { replace: true })
          }}>{t('common.confirm')}</button>
        </div>
      </Dialog>
      <PasswordSheet mode={lockMode} onClose={() => setLockMode(null)} onEnable={enableLock} onDisable={disableLock} onChange={setPasswordHash} hash={settings.passwordHash} />
    </div>
  )
}

function PasswordSheet({
  mode,
  hash,
  onClose,
  onEnable,
  onDisable,
  onChange,
}: {
  mode: 'enable' | 'disable' | 'change' | null
  hash: string | null
  onClose: () => void
  onEnable: (hash: string) => void
  onDisable: () => void
  onChange: (hash: string) => void
}) {
  const { t } = useTranslation()
  return (
    <BottomSheet open={!!mode} onClose={onClose} closeLabel={t('common.close')}>
      {mode ? (
        <PasswordForm key={mode} mode={mode} hash={hash} onClose={onClose} onEnable={onEnable} onDisable={onDisable} onChange={onChange} />
      ) : null}
    </BottomSheet>
  )
}

function PasswordForm({
  mode,
  hash,
  onClose,
  onEnable,
  onDisable,
  onChange,
}: {
  mode: 'enable' | 'disable' | 'change'
  hash: string | null
  onClose: () => void
  onEnable: (hash: string) => void
  onDisable: () => void
  onChange: (hash: string) => void
}) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [step, setStep] = useState<'current' | 'next'>('current')
  const [error, setError] = useState('')
  async function submit() {
    setError('')
    if (mode === 'disable' || (mode === 'change' && step === 'current')) {
      if ((await sha256(current)) !== hash) {
        setError(t('lock.wrong'))
        return
      }
      if (mode === 'disable') {
        onDisable()
        onClose()
        return
      }
      setStep('next')
      return
    }
    if (!next.trim() || next !== again) {
      setError(t('settings.passwordAgain'))
      return
    }
    const digest = await sha256(next)
    if (mode === 'enable') onEnable(digest)
    else onChange(digest)
    onClose()
  }
  const changing = mode === 'change' && step === 'next'
  const setting = mode === 'enable' || changing
  return (
    <>
      <SheetHeader title={mode === 'enable' ? t('settings.setPassword') : mode === 'change' ? t('settings.changePassword') : t('settings.lock')} onClose={onClose} closeLabel={t('common.close')} />
      <form className="sheet-body stack" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {!setting ? <input className="field" type="password" value={current} placeholder={t('settings.currentPassword')} onChange={(event) => setCurrent(event.target.value)} /> : null}
        {setting ? (
          <>
            <input className="field" type="password" value={next} placeholder={t('settings.newPassword')} onChange={(event) => setNext(event.target.value)} />
            <input className="field" type="password" value={again} placeholder={t('settings.repeatPassword')} onChange={(event) => setAgain(event.target.value)} />
          </>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn primary">{t('common.confirm')}</button>
      </form>
    </>
  )
}
