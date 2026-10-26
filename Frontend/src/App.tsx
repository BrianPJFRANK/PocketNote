import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { OverlayContext } from './overlay.ts'
import { Shell } from './components/Shell.tsx'
import { Mascot } from './components/Mascot.tsx'
import loadingArt from './assets/general_components/loading.jpeg'
import { SessionContext } from './session.ts'
import i18n from './i18n/index.ts'
import { useStore } from './store/useStore.ts'
import { modulePath } from './lib/routes.ts'
import { sha256 } from './lib/hash.ts'
import { verifyBiometric } from './lib/biometric.ts'
import { CalendarPage } from './features/todo/CalendarPage.tsx'
import { TasksPage } from './features/todo/TasksPage.tsx'
import { StatsPage } from './features/todo/StatsPage.tsx'
import { LedgerHome } from './features/ledger/LedgerHome.tsx'
import { BudgetPage } from './features/ledger/BudgetPage.tsx'
import { ReportsPage } from './features/ledger/ReportsPage.tsx'
import { AccountsPage } from './features/ledger/AccountsPage.tsx'
import { ActivityPage } from './features/ledger/ActivityPage.tsx'
import { TxnPage } from './features/ledger/TxnPage.tsx'
import { MemoListPage } from './features/memo/MemoListPage.tsx'
import { MemoEditPage } from './features/memo/MemoEditPage.tsx'
import { TrashPage } from './features/memo/TrashPage.tsx'
import { SettingsPage } from './features/settings/SettingsPage.tsx'

function AppRoutes() {
  const location = useLocation()
  const background = (location.state as { background?: Location } | null)?.background
  const txn = location.pathname === '/ledger/new' || location.pathname.startsWith('/ledger/edit/')
  const under = txn ? (background ?? '/ledger') : location
  return (
    <>
      <Routes location={under}>
        <Route element={<Shell />}>
          <Route path="/" element={<Start />} />
          <Route path="/todo" element={<CalendarPage />} />
          <Route path="/todo/tasks" element={<TasksPage />} />
          <Route path="/todo/stats" element={<StatsPage />} />
          <Route path="/ledger" element={<LedgerHome />} />
          <Route path="/ledger/budget" element={<BudgetPage />} />
          <Route path="/ledger/reports" element={<ReportsPage />} />
          <Route path="/ledger/accounts" element={<AccountsPage />} />
          <Route path="/ledger/activity" element={<ActivityPage />} />
          <Route path="/memo" element={<MemoListPage />} />
          <Route path="/memo/new" element={<MemoEditPage />} />
          <Route path="/memo/edit/:id" element={<MemoEditPage />} />
          <Route path="/memo/trash" element={<TrashPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Start />} />
        </Route>
      </Routes>
      {txn ? (
        <Routes>
          <Route path="/ledger/new" element={<TxnPage />} />
          <Route path="/ledger/edit/:id" element={<TxnPage />} />
        </Routes>
      ) : null}
    </>
  )
}

function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated())
  useEffect(() => {
    setHydrated(useStore.persist.hasHydrated())
    return useStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])
  return hydrated
}

export default function App() {
  const hydrated = useHydrated()
  const settings = useStore((state) => state.settings)
  const purgeTrash = useStore((state) => state.purgeTrash)
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1100)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    purgeTrash()
    void i18n.changeLanguage(settings.locale)
    document.documentElement.lang = settings.locale === 'zh-CN' ? 'zh-Hans' : settings.locale === 'en' ? 'en' : 'zh-Hant'
  }, [hydrated, purgeTrash, settings.locale])

  const booting = !hydrated || !ready
  let screen = <Splash />
  if (!booting && settings.appLockEnabled && !unlocked) screen = <Lock onUnlock={() => setUnlocked(true)} />
  if (!booting && (!settings.appLockEnabled || unlocked)) {
    screen = (
      <SessionContext.Provider value={{ unlock: () => setUnlocked(true) }}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessionContext.Provider>
    )
  }

  return <Viewport>{screen}</Viewport>
}

function Viewport({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  return (
    <div className="screen">
      <OverlayContext.Provider value={node}>
        {children}
        <div className="overlay-root" ref={setNode} />
      </OverlayContext.Provider>
    </div>
  )
}

function Start() {
  const moduleId = useStore((state) => state.settings.defaultModule)
  return <Navigate to={modulePath(moduleId)} replace />
}

function Splash() {
  const { t } = useTranslation()
  return (
    <div className="gate">
      <img className="gate-art" src={loadingArt} alt="" />
      <h1>Pocket Note</h1>
      <p>{t('splash.loading')}</p>
    </div>
  )
}

function Lock({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation()
  const settings = useStore((state) => state.settings)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [usePassword, setUsePassword] = useState(!settings.biometricEnabled)

  async function unlockWithPassword() {
    const hash = await sha256(password)
    if (hash === settings.passwordHash) onUnlock()
    else setError(t('lock.wrong'))
  }

  return (
    <div className="gate">
      <h1>Pocket Note</h1>
      <Mascot pose="greet" size="md" />
      {settings.biometricEnabled && !usePassword ? (
        <div className="stack">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (!settings.biometricCredentialId) {
                setUsePassword(true)
                return
              }
              void verifyBiometric(settings.biometricCredentialId).then((ok) => {
                if (ok) onUnlock()
                else setUsePassword(true)
              })
            }}
          >
            {t('lock.biometric')}
          </button>
          <button type="button" className="btn ghost" onClick={() => setUsePassword(true)}>
            {t('lock.usePassword')}
          </button>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            void unlockWithPassword()
          }}
        >
          <input className="field" type="password" value={password} placeholder={t('lock.password')} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="btn primary">
            {t('lock.unlock')}
          </button>
        </form>
      )}
    </div>
  )
}
