import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { routes } from '../app/routes'
import { Badge, Gap, InkCard, Page, Spinner } from '../components/Page'
import { appConstants } from '../core/config'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { RoomEventType, ServerEvent } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

/** 참가자: 팀 빌딩 대기. SSE 로 참가자 수·팀 빌딩 완료를 받고, 끊긴 동안만 폴링 */
export function TeamBuildingWaitPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const [participantCount, setParticipantCount] = useState<number | null>(null)
  const [assigned, setAssigned] = useState(false)

  const goToTeam = useCallback(() => {
    setAssigned(true)
    navigate(routes.teamNumber(code), { replace: true })
  }, [code, navigate])

  const handleEvent = useCallback(
    (type: RoomEventType, event: ServerEvent) => {
      switch (type) {
        case 'PARTICIPANT_JOINED':
        case 'PARTICIPANT_LEFT':
        case 'PARTICIPANT_SURVEY_DONE': {
          const count = event.payload.participantCount
          if (typeof count === 'number') setParticipantCount(count)
          return
        }
        case 'TEAM_BUILDING_COMPLETED':
          if (event.payload.myTeam) goToTeam()
          return
        case 'ROOM_FINISHED':
          navigate(routes.home, { replace: true })
          return
        default:
          return
      }
    },
    [goToTeam, navigate],
  )

  const { connected } = useServerEvents(code ? endpoints.roomMeEvents(code) : null, handleEvent)

  const checkAssignment = useCallback(async () => {
    const team = await iceLinkApi.fetchMyTeam(code)
    if (team) {
      goToTeam()
      return
    }
    try {
      const me = await iceLinkApi.fetchRoomMe(code)
      setParticipantCount(me.room.participantCount)
    } catch {
      // ignore
    }
  }, [code, goToTeam])

  usePolling(checkAssignment, appConstants.pollIntervalMs, !assigned && !connected)

  return (
    <Page title="팀 빌딩 대기" centered>
      <InkCard className="items-center text-center" style={{ padding: 32 }}>
        <Spinner light size={30} />
        <span className="mt-7 text-[12px] font-semibold tracking-[0.12em] uppercase text-white/50">Waiting</span>
        <h2 className="display mt-3">팀을 나누고 있어요</h2>
        <p className="mt-3 max-w-[28ch] text-[14px] leading-relaxed text-white/60">
          주최자가 시작하면 팀 번호가 자동으로 표시돼요. 화면을 켜 둔 채 잠시만 기다려 주세요.
        </p>
        {participantCount !== null && (
          <Badge tone="onDark" className="mt-6">
            현재 참가자 {participantCount}명
          </Badge>
        )}
      </InkCard>
      <Gap size={6} />
      <p className="text-center text-[13px] text-muted">
        {assigned ? '팀 배정 완료' : connected ? '실시간으로 팀 배정을 기다리는 중' : '팀 배정 결과를 확인하는 중'}
      </p>
    </Page>
  )
}
