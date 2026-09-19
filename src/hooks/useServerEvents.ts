import { useEffect, useRef, useState } from 'react'

import { apiConfig } from '../core/config'
import { getUserKey } from '../data/apiClient'
import type { RoomEventType, ServerEvent } from '../data/types'

/** 백엔드 `RoomEventType` + 접속 직후 1회 오는 CONNECTED */
const EVENT_NAMES: (RoomEventType | 'CONNECTED')[] = [
  'CONNECTED',
  'PARTICIPANT_JOINED',
  'PARTICIPANT_LEFT',
  'PARTICIPANT_SURVEY_DONE',
  'ROOM_UPDATED',
  'TEAM_BUILDING_STARTED',
  'TEAM_BUILDING_COMPLETED',
  'ROOM_FINISHED',
  'TEAM_STATUS_CHANGED',
  'TEAM_FINISHED',
  'TEAM_STARTED',
  'TEAM_NAME_CHANGED',
  'QUESTION_GENERATING',
  'QUESTION_CREATED',
  'ANSWER_PROCESSING',
  'ANSWER_PROCESSED',
  'ANSWER_FAILED',
]

const RECONNECT_DELAY_MS = 3_000

export type ServerEventHandler = (type: RoomEventType, event: ServerEvent) => void

/**
 * 백엔드 SSE 스트림 구독 (docs 3절). `EventSource` 는 헤더를 못 붙이므로 `?userKey=` 쿼리로 인증한다.
 * 끊기면 브라우저가 `Last-Event-ID` 를 실어 자동 재연결하고, 서버는 누락 이벤트를 재전송한다.
 *
 * @param path  baseUrl 기준 경로. null 이면 구독하지 않는다.
 * @returns connected — 화면은 이 값이 false 일 때만 폴링 폴백을 돌린다 (RT-04).
 */
export function useServerEvents(path: string | null, onEvent: ServerEventHandler): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const handlerRef = useRef(onEvent)

  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    const userKey = getUserKey()
    if (!path || !userKey || typeof EventSource === 'undefined') {
      return
    }

    let source: EventSource | null = null
    let retryTimer: number | null = null
    let disposed = false

    // 일반 REST 와 다른 호스트(연결 풀)를 써서 SSE 가 브라우저의 호스트당 6연결 한도를 잡아먹지 않게 한다 (config 참고)
    const url = `${apiConfig.sseBaseUrl}${path}${path.includes('?') ? '&' : '?'}userKey=${encodeURIComponent(userKey)}`

    const connect = () => {
      if (disposed) return
      source = new EventSource(url)

      for (const name of EVENT_NAMES) {
        source.addEventListener(name, (raw) => {
          const message = raw as MessageEvent<string>
          if (name === 'CONNECTED') {
            setConnected(true)
            return
          }
          let data: ServerEvent
          try {
            data = JSON.parse(message.data) as ServerEvent
          } catch {
            return
          }
          handlerRef.current(name, data)
        })
      }

      source.onopen = () => setConnected(true)
      source.onerror = () => {
        setConnected(false)
        // readyState CLOSED 면 브라우저가 재시도하지 않으므로 직접 다시 연다 (401/403/404 등)
        if (source?.readyState === EventSource.CLOSED) {
          source.close()
          source = null
          retryTimer = window.setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      source?.close()
      setConnected(false)
    }
  }, [path])

  return { connected }
}
