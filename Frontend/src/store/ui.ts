import { create } from 'zustand'

interface UiState {
  drawer: boolean
  setDrawer: (drawer: boolean) => void
  fab: (() => void) | null
  setFab: (fab: (() => void) | null) => void
  toast: string | null
  showToast: (toast: string) => void
  blink: boolean
  flashBlink: () => void
}

let toastTimer = 0
let blinkTimer = 0

export const useUi = create<UiState>((set) => ({
  drawer: false,
  setDrawer: (drawer) => set({ drawer }),
  fab: null,
  setFab: (fab) => set({ fab }),
  toast: null,
  showToast: (toast) => {
    window.clearTimeout(toastTimer)
    set({ toast })
    toastTimer = window.setTimeout(() => set({ toast: null }), 2200)
  },
  blink: false,
  flashBlink: () => {
    window.clearTimeout(blinkTimer)
    set({ blink: true })
    blinkTimer = window.setTimeout(() => set({ blink: false }), 1600)
  },
}))
