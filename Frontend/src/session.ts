import { createContext } from 'react'

export interface SessionValue {
  unlock: () => void
}

export const SessionContext = createContext<SessionValue | null>(null)
