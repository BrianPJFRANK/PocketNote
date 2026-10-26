import { createContext, useContext, useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { OverlayContext } from '../overlay.ts'
import { Icon } from './Icon.tsx'
import cannotFind from '../assets/general_components/cannotFind.png'

const SheetSlideContext = createContext<(() => void) | null>(null)

export function useSheetSlideClose(): (() => void) | null {
  return useContext(SheetSlideContext)
}

export function BottomSheet({ open, onClose, closeLabel, children, dragHandle = false, onDragClose }: { open: boolean; onClose: () => void; closeLabel: string; children: ReactNode; dragHandle?: boolean; onDragClose?: () => boolean }) {
  const root = useContext(OverlayContext)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const closing = useRef(false)
  const onCloseRef = useRef(onClose)
  const onDragCloseRef = useRef(onDragClose)
  onCloseRef.current = onClose
  onDragCloseRef.current = onDragClose
  const drag = useRef({ y: 0, lastY: 0, lastT: 0, dy: 0, v: 0, active: false })

  function playClose() {
    const panel = panelRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!panel || reduce) {
      onCloseRef.current()
      return
    }
    closing.current = true
    panel.classList.remove('sheet-drag')
    panel.classList.add('sheet-settle')
    const fromDrag = panel.style.transform.includes('translateY(') && !panel.style.transform.includes('translateY(0')
    if (!fromDrag) {
      panel.style.transform = 'translateY(0px)'
      panel.getBoundingClientRect()
    }
    panel.style.transform = 'translateY(100%)'
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => onCloseRef.current(), 260)
  }

  function requestSlideClose() {
    if (closing.current) return
    if (onDragCloseRef.current?.() === false) return
    playClose()
  }
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current)
  }, [])
  if (!open || !root) return null

  function onGrabDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const now = performance.now()
    drag.current = { y: event.clientY, lastY: event.clientY, lastT: now, dy: 0, v: 0, active: true }
    const panel = panelRef.current
    if (!panel) return
    panel.classList.add('sheet-drag')
    panel.classList.remove('sheet-settle')
    panel.style.transform = 'translateY(0px)'
  }

  function onGrabMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const now = performance.now()
    const dy = Math.max(0, event.clientY - drag.current.y)
    const dt = now - drag.current.lastT
    if (dt > 0) drag.current.v = (event.clientY - drag.current.lastY) / dt
    drag.current.lastY = event.clientY
    drag.current.lastT = now
    drag.current.dy = dy
    if (panelRef.current) panelRef.current.style.transform = `translateY(${dy}px)`
  }

  function onGrabUp() {
    if (!drag.current.active) return
    drag.current.active = false
    const panel = panelRef.current
    if (!panel) return
    const dy = drag.current.dy
    const shouldClose = dy > 120 || (dy > 48 && drag.current.v > 0.6)
    panel.classList.remove('sheet-drag')
    const allowed = shouldClose && onDragCloseRef.current?.() !== false
    if (!allowed) {
      panel.classList.add('sheet-settle')
      panel.style.transform = 'translateY(0px)'
      closeTimer.current = window.setTimeout(() => {
        panel.style.transform = ''
        panel.classList.remove('sheet-settle')
      }, 280)
      return
    }
    playClose()
  }

  return createPortal(
    <SheetSlideContext.Provider value={requestSlideClose}>
      <div className="sheet" role="dialog">
        <button type="button" className="sheet-backdrop" aria-label={closeLabel} onClick={onClose} />
        <div className="sheet-panel" ref={panelRef}>
          {dragHandle ? (
            <div className="sheet-grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
              <span />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </SheetSlideContext.Provider>,
    root,
  )
}

export function SheetHeader({ title, onClose, closeLabel, right }: { title?: string; onClose: () => void; closeLabel: string; right?: ReactNode }) {
  return (
    <div className="sheet-head">
      <div className="sheet-side">
        <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
          <Icon name="close" />
        </button>
      </div>
      <div className="sheet-title">{title}</div>
      <div className="sheet-side end">{right}</div>
    </div>
  )
}

export function Dialog({
  open,
  title,
  body,
  children,
  onClose,
  closeLabel,
  className,
}: {
  open: boolean
  title: string
  body?: string
  children?: ReactNode
  onClose?: () => void
  closeLabel: string
  className?: string
}) {
  const root = useContext(OverlayContext)
  if (!open || !root) return null
  return createPortal(
    <div className="dialog-layer" role="dialog" aria-modal="true">
      <button type="button" className="sheet-backdrop" aria-label={closeLabel} onClick={onClose} />
      <div className={className ? `dialog ${className}` : 'dialog'}>
        {onClose ? (
          <button type="button" className="icon-btn dialog-x" onClick={onClose} aria-label={closeLabel}>
            <Icon name="close" />
          </button>
        ) : null}
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
        {children}
      </div>
    </div>,
    root,
  )
}

export function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={compact ? 'empty compact' : 'empty'}>
      <img className="empty-art" src={cannotFind} alt="" />
      <p>{text}</p>
    </div>
  )
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input className="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
}

export function PopMenu({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  if (!open) return null
  return (
    <>
      <button type="button" className="menu-backdrop" aria-label={label} onClick={onClose} />
      <div className="menu-pop" role="menu">
        {children}
      </div>
    </>
  )
}
