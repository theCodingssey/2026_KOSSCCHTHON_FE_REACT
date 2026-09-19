import { ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Gap, InkCard, Page, Spinner } from '../components/Page'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { ParticipantTeamView, RoomEventType, ServerEvent } from '../data/types'
import { useServerEvents } from '../hooks/useServerEvents'

/**
 * 참가자: 배정된 팀 확인. 팀원 한 명이 세션을 시작하면(TEAM_STARTED) 모두 질문 화면으로 함께 이동.
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
        if (result.status !== 'NOT_STARTED') {
          navigate(routes.teamQuestion(result.teamId), { replace: true })
        }
      } catch (error) {
        if (!cancelled) {
          showToast('팀을 불러오지 못했어요', describeError(error), 'error')
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
      if (type === 'TEAM_STARTED' || type === 'ROOM_FINISHED') {
        navigate(routes.teamQuestion(team.teamId), { replace: true })
      } else if (type === 'TEAM_NAME_CHANGED') {
        setTeam((prev) => (prev ? { ...prev, name: String(event.payload.name ?? prev.name) } : prev))
      }
    },
    [team, navigate],
  )

  useServerEvents(team ? endpoints.teamEvents(team.teamId) : null, handleEvent)

  return (
    <Page title="팀 확인" centered>
      <InkCard className="items-center text-center" style={{ padding: 32 }}>
        <span className="text-[12px] font-semibold tracking-[0.12em] text-white/50">당신의 팀</span>
        <Gap size={4} />
        {loading ? (
          <Spinner light size={30} />
        ) : (
          <div className="text-[96px] font-semibold leading-none tracking-[-0.04em] tabular">{team?.teamNo ?? '–'}</div>
        )}
        {team && (
          <>
            <div className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{team.name}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {team.members.map((m) => (
                <span
                  key={m.participantId}
                  className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                    m.isMe ? 'bg-white text-ink' : 'bg-white/10 text-white/80'
                  }`}
                >
                  {m.nickname}
                  {m.isMe && <span className="ml-1 text-[11px] text-muted">나</span>}
                </span>
              ))}
            </div>
          </>
        )}
      </InkCard>
      <Gap size={7} />
      <Button icon={ArrowRight} disabled={!team} onClick={() => team && navigate(routes.teamQuestion(team.teamId))}>
        팀원 모두 모였어요
      </Button>
      <p className="mt-3 text-center text-[12px] text-faint">팀원 중 한 명이 누르면 모두 함께 질문 화면으로 넘어가요.</p>
    </Page>
  )
}
