import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { InkCard, Page, Spinner } from '../components/Page'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { ParticipantTeamView, RoomEventType, ServerEvent } from '../data/types'
import { useServerEvents } from '../hooks/useServerEvents'

/**
 * Flutter `TeamNumberPage`. 새로고침에도 안전하도록 팀 정보를 서버에서 다시 읽는다.
 * 팀원 한 명이 질문 페이지로 넘어가 세션을 시작하면(TEAM_STARTED) 나머지 팀원 화면도 함께 넘어간다.
 */
export function TeamNumberPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [team, setTeam] = useState<ParticipantTeamView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await iceLinkApi.fetchMyTeam(code)
        if (cancelled) return
        if (!result) {
          navigate(routes.teamBuildingWait(code), { replace: true })
          return
        }
        setTeam(result)
        // 이미 세션이 시작된 팀이면 바로 질문 화면으로
        if (result.status !== 'NOT_STARTED') {
          navigate(routes.teamQuestion(result.teamId), { replace: true })
        }
      } catch (error) {
        if (!cancelled) {
          showToast('팀 조회 실패', describeError(error), 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code, navigate, showToast])

  const handleEvent = useCallback(
    (type: RoomEventType, event: ServerEvent) => {
      if (!team) return
      if (type === 'TEAM_STARTED') {
        navigate(routes.teamQuestion(team.teamId), { replace: true })
      } else if (type === 'TEAM_NAME_CHANGED') {
        setTeam((prev) => (prev ? { ...prev, name: String(event.payload.name ?? prev.name) } : prev))
      } else if (type === 'ROOM_FINISHED') {
        navigate(routes.teamQuestion(team.teamId), { replace: true })
      }
    },
    [team, navigate],
  )

  useServerEvents(team ? endpoints.teamEvents(team.teamId) : null, handleEvent)

  return (
    <Page title="팀 번호 확인하기" centered>
      <InkCard className="card--center">
        <span className="subtitle" style={{ fontSize: 18, fontWeight: 800 }}>
          당신의 팀 번호
        </span>
        <div className="gap-16" />
        {loading ? <Spinner light /> : <span className="big-number">{team?.teamNo ?? '-'}</span>}
        {team && (
          <>
            <div className="gap-18" />
            <span className="eyebrow">{team.name}</span>
            <div className="gap-8" />
            <p className="subtitle text-center" style={{ fontSize: 15 }}>
              {team.members.map((m) => (m.isMe ? `${m.nickname} (나)` : m.nickname)).join(' · ')}
            </p>
          </>
        )}
      </InkCard>
      <div className="gap-28" />
      <Button icon="arrow_forward" disabled={!team} onClick={() => team && navigate(routes.teamQuestion(team.teamId))}>
        질문 페이지로 이동
      </Button>
      <div className="gap-12" />
      <p className="status-line" style={{ fontSize: 13 }}>
        팀원 중 한 명이 이동하면 모두 함께 질문 화면으로 넘어갑니다.
      </p>
    </Page>
  )
}
