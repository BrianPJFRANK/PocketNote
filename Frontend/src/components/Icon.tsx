export type IconName =
  | 'menu'
  | 'close'
  | 'back'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevron'
  | 'check'
  | 'plus'
  | 'calendar'
  | 'list'
  | 'chart'
  | 'home'
  | 'pie'
  | 'wallet'
  | 'pin'
  | 'trash'
  | 'more'
  | 'camera'
  | 'image'
  | 'mail'
  | 'backspace'
  | 'filter'
  | 'gear'

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === 'close' && <path d="M6 6l12 12M18 6L6 18" />}
      {name === 'back' && <path d="M15 5l-7 7 7 7" />}
      {name === 'chevronLeft' && <path d="M14 6l-6 6 6 6" />}
      {name === 'chevronRight' && <path d="M10 6l6 6-6 6" />}
      {name === 'chevron' && <path d="M9 6l6 6-6 6" />}
      {name === 'check' && <path d="M5 12.5l4.2 4.2L19 7.5" />}
      {name === 'plus' && <path d="M12 5v14M5 12h14" />}
      {name === 'calendar' && <path d="M7 3v3M17 3v3M4 8h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />}
      {name === 'list' && <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />}
      {name === 'chart' && <path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3" />}
      {name === 'home' && <path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />}
      {name === 'pie' && <path d="M12 3a9 9 0 1 0 9 9h-9zM12 3v9h9" />}
      {name === 'wallet' && <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H19v12H5.5A2.5 2.5 0 0 1 3 15.5zM16 12h4" />}
      {name === 'pin' && <path d="M9 4h6l-1 6 3 3v1H7v-1l3-3zM12 14v6" />}
      {name === 'trash' && <path d="M4 7h16M9 7V5h6v2M8 7l1 13h6l1-13" />}
      {name === 'more' && <path d="M6 12h.01M12 12h.01M18 12h.01" />}
      {name === 'camera' && <path d="M4 8h3l2-2h6l2 2h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />}
      {name === 'image' && <path d="M4 6h16v12H4zM8 14l2.5-3 2 2.5L16 10l4 5" />}
      {name === 'mail' && <path d="M4 6h16v12H4zM4 7l8 6 8-6" />}
      {name === 'backspace' && <path d="M8 6h12v12H8L3 12zM10 10l6 6M16 10l-6 6" />}
      {name === 'filter' && <path d="M4 6h16l-6 7v5l-4 2v-7z" />}
      {name === 'gear' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </>
      )}
    </svg>
  )
}

export function MenuButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} aria-label={label}>
      <Icon name="menu" />
    </button>
  )
}

export function CheckBubble({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={on ? 'check on' : 'check'}
      aria-label={label}
      aria-pressed={on}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {on && <Icon name="check" size={16} />}
    </button>
  )
}

export function Switch({ on, disabled, label, onClick }: { on: boolean; disabled?: boolean; label: string; onClick: () => void }) {
  return <button type="button" className={on ? 'switch on' : 'switch'} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick} />
}
