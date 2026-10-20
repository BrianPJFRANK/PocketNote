import { useEffect, useRef } from 'react'
import { useUi } from '../store/ui.ts'

export function useFab(enabled: boolean, handler: () => void): void {
  const setFab = useUi((state) => state.setFab)
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!enabled) return
    setFab(() => ref.current())
    return () => setFab(null)
  }, [enabled, setFab])
}
