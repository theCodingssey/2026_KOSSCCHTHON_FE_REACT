import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { clearUserKey, getUserKey, setUserKey } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'
import { sessionStorageService } from '../data/sessionStorage'
import { SessionContext, type LoginSession, type SessionContextValue } from './session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<LoginSession | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const restoreStarted = useRef(false)

  const applyUserKey = useCallback((userKey: string) => {
    sessionStorageService.saveUserKey(userKey)
    setUserKey(userKey)
  }, [])

  const logout = useCallback(() => {
    sessionStorageService.clearUserKey()
    clearUserKey()
    setSession(null)
  }, [])

  const refresh = useCallback(async (): Promise<LoginSession | null> => {
    // 이 탭에서 이미 로그인한 키(메모리)를 우선하고, 새로고침 직후에만 저장소에서 읽는다.
    const userKey = getUserKey() ?? sessionStorageService.readUserKey()
    if (!userKey) {
      return null
    }
    setUserKey(userKey)
    const me = await iceLinkApi.fetchMe()
    const next: LoginSession = { name: me.name || '사용자', userKey, activeRoom: me.activeRoom }
    setSession(next)
    return next
  }, [])

  const login = useCallback(
    async (name: string): Promise<LoginSession> => {
      const user = await iceLinkApi.registerUser(name.trim())
      applyUserKey(user.userKey)
      const next: LoginSession = { name: user.name || name.trim(), userKey: user.userKey, activeRoom: null }
      setSession(next)
      return next
    },
    [applyUserKey],
  )

  useEffect(() => {
    if (restoreStarted.current) {
      return
    }
    restoreStarted.current = true
    ;(async () => {
      try {
        await refresh()
      } catch {
        // 키가 서버에 없거나(재배포로 DB 초기화 등) 네트워크 실패면 로그인 화면으로
        logout()
      } finally {
        setIsRestoring(false)
      }
    })()
  }, [refresh, logout])

  const value = useMemo<SessionContextValue>(
    () => ({ session, isRestoring, login, refresh, logout }),
    [session, isRestoring, login, refresh, logout],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
