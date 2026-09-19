import { createContext, useContext } from 'react'

import type { ActiveRoomResponse } from '../data/types'

/** Flutter `LoginSession` + `LoginController._restoreSession` 대응 */
export interface LoginSession {
  name: string
  userKey: string
  activeRoom: ActiveRoomResponse | null
}

export interface SessionContextValue {
  session: LoginSession | null
  /** 앱 첫 진입 시 저장된 키로 세션 복원 중 */
  isRestoring: boolean
  login: (name: string) => Promise<LoginSession>
  refresh: () => Promise<LoginSession | null>
  logout: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return ctx
}
