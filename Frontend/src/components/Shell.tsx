import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot.tsx'
import { Icon, type IconName } from './Icon.tsx'
import { useUi } from '../store/ui.ts'
import addButton from '../assets/general_components/addButton.png'

export function Shell() {
  const { t } = useTranslation()
  const location = useLocation()
  const background = (location.state as { background?: { pathname: string } } | null)?.background
  const txn = location.pathname === '/ledger/new' || location.pathname.startsWith('/ledger/edit/')
  const pathname = txn ? (background?.pathname ?? '/ledger') : location.pathname
  const fab = useUi((state) => state.fab)
  const toast = useUi((state) => state.toast)
  const drawer = useUi((state) => state.drawer)
  const setDrawer = useUi((state) => state.setDrawer)
  const items = navFor(pathname, t)
  useEffect(() => {
    setDrawer(false)
  }, [pathname, setDrawer])

  return (
    <div className={items ? 'shell with-nav' : 'shell'}>
      <div className={fab ? 'stage with-fab' : 'stage'}>
        <Outlet />
      </div>
      {items ? (
        <nav className="bottom-nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navActive(pathname, item.to, item.end) ? 'nav-btn active' : 'nav-btn'}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
      {fab ? (
        <button type="button" className="fab" onClick={fab} aria-label={t('nav.create')}>
          <img src={addButton} alt="" />
        </button>
      ) : null}
      {drawer ? (
        <div className="drawer">
          <button type="button" className="sheet-backdrop" aria-label={t('common.close')} onClick={() => setDrawer(false)} />
          <aside className="drawer-panel">
            <div className="drawer-brand">
              <Mascot pose="bust" size="sm" />
              <strong>Pocket Note</strong>
            </div>
            <div className="drawer-list">
              <DrawerLink to="/ledger" active={pathname.startsWith('/ledger')} label={t('nav.ledger')} onClick={() => setDrawer(false)} />
              <DrawerLink to="/todo" active={pathname.startsWith('/todo')} label={t('nav.todo')} onClick={() => setDrawer(false)} />
              <DrawerLink to="/memo" active={pathname.startsWith('/memo')} label={t('nav.memo')} onClick={() => setDrawer(false)} />
            </div>
            <NavLink to="/settings" state={{ back: pathname }} className="drawer-foot" onClick={() => setDrawer(false)}>
              {t('settings.title')}
            </NavLink>
          </aside>
        </div>
      ) : null}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function DrawerLink({ to, label, active, onClick }: { to: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <NavLink to={to} className={active ? 'drawer-item active' : 'drawer-item'} onClick={onClick}>
      {label}
    </NavLink>
  )
}

function navActive(pathname: string, to: string, end?: boolean): boolean {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}

function navFor(pathname: string, t: (key: string) => string): { to: string; label: string; icon: IconName; end?: boolean }[] | null {
  if (pathname === '/todo' || pathname === '/todo/tasks' || pathname === '/todo/stats') {
    return [
      { to: '/todo', label: t('nav.calendar'), icon: 'calendar', end: true },
      { to: '/todo/tasks', label: t('nav.allTasks'), icon: 'list' },
      { to: '/todo/stats', label: t('nav.stats'), icon: 'chart' },
    ]
  }
  if (pathname === '/ledger' || pathname === '/ledger/budget' || pathname === '/ledger/reports' || pathname === '/ledger/accounts') {
    return [
      { to: '/ledger', label: t('nav.home'), icon: 'home', end: true },
      { to: '/ledger/budget', label: t('nav.budget'), icon: 'pie' },
      { to: '/ledger/reports', label: t('nav.reports'), icon: 'chart' },
      { to: '/ledger/accounts', label: t('nav.accounts'), icon: 'wallet' },
    ]
  }
  return null
}
