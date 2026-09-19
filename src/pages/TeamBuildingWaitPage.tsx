import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { routes } from '../app/routes'
import { InkCard, Page, Spinner } from '../components/Page'
import { appConstants } from '../core/config'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { RoomEventType, ServerEvent } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

/**
 * Flutter `TeamBuildingWaitPage` + `JoinRoomController._startTeamAssignmentPolling`.
 * 참가자 SSE 스트림(RT-02)으로 참가자 수와 팀 빌딩 완료를 즉시 받고, SSE 가 끊긴 동안만 3초 폴링한다.
 */
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
          // 참가자 스트림엔 myTeam 이 채워져 온다. null 이면(LATE) 그대로 대기.
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

  // 첫 진입 시 1회 + SSE 미연결 동안 폴링 폴백. (연결 중엔 첫 틱만 돌고 멈춤)
  usePolling(checkAssignment, appConstants.pollIntervalMs, !assigned && !connected)

  return (
    <Page title="팀 빌딩 대기" centered>
      <InkCard className="card--center">
        <Spinner light />
        <div className="gap-24" />
        <h2 className="headline headline--center">팀 빌딩 중입니다...</h2>
        <div className="gap-12" />
        <p className="subtitle text-center">{'주최자가 시작하면\n팀 번호가 자동으로 표시됩니다.'}</p>
        {participantCount !== null && (
          <>
            <div className="gap-18" />
            <span className="badge badge--info">현재 참가자 {participantCount}명</span>
          </>
        )}
      </InkCard>
      <div className="gap-28" />
      <p className="status-line">
        {assigned ? '팀 배정 완료' : connected ? '실시간으로 팀 배정을 기다리는 중' : '팀 배정 결과를 확인하는 중'}
      </p>
    </Page>
  )
}
