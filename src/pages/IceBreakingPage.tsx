import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Card, InkCard, Page } from '../components/Page'
import { Icon } from '../components/Icon'
import { appConstants } from '../core/config'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { RoomEventType, RoomTeamSummary, TeamStatus } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

const TEAM_STATUS_LABEL: Record<TeamStatus, { text: string; tone: string }> = {
  NOT_STARTED: { text: '모이는 중', tone: 'badge--warn' },
  NAMING: { text: '팀명 정하기', tone: 'badge--info' },
  QUESTIONING: { text: '질문 진행', tone: 'badge--ok' },
  FINISHED: { text: '종료', tone: '' },
}

/**
 * Flutter `IceBreakingPage` + `IceBreakingController`.
 * 원본은 화면 전환만 했지만, 웹 테스트가 목적이므로 종료 버튼이 실제 `POST /host/rooms/{code}/finish` 를 호출하고
 * 팀 진행 상황을 3초 주기로 보여준다.
 */
export function IceBreakingPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { refresh } = useSession()

  const [teams, setTeams] = useState<RoomTeamSummary[]>([])
  const [isFinishing, setIsFinishing] = useState(false)

  const loadRoom = useCallback(async () => {
    const detail = await iceLinkApi.fetchHostRoom(code)
    setTeams(detail.teams)
    if (detail.status === 'FINISHED') {
      navigate(routes.iceBreakingComplete(code), { replace: true })
    }
  }, [code, navigate])

  /** 주최자 SSE 스트림 (RT-01): 팀명 변경·상태 전이·질문 생성마다 팀 목록을 다시 읽는다 */
  const handleEvent = useCallback(
    (type: RoomEventType) => {
      if (type.startsWith('TEAM_') || type.startsWith('QUESTION_') || type === 'ROOM_FINISHED') {
        void loadRoom().catch(() => undefined)
      }
    },
    [loadRoom],
  )
  const { connected } = useServerEvents(code ? endpoints.hostRoomEvents(code) : null, handleEvent)

  // 첫 진입 1회 + SSE 미연결 동안만 3초 폴링
  usePolling(loadRoom, appConstants.pollIntervalMs, !isFinishing && !connected)

  const finishIceBreaking = async () => {
    setIsFinishing(true)
    try {
      await iceLinkApi.finishRoom(code)
      void refresh().catch(() => undefined)
      navigate(routes.iceBreakingComplete(code), { replace: true })
    } catch (error) {
      showToast('종료 실패', describeError(error, '아이스 브레이킹을 종료하지 못했습니다.'), 'error')
      setIsFinishing(false)
    }
  }

  return (
    <Page
      title="아이스 브레이킹"
      footer={
        <Button icon="done_all" loading={isFinishing} small onClick={finishIceBreaking}>
          추가 질문 제시 후 아이스 브레이킹 마치기!
        </Button>
      }
    >
      <div className="gap-16" />
      <InkCard className="card--center">
        <Icon name="groups_2" size={58} className="eyebrow" />
        <div className="gap-18" />
        <h2 className="headline headline--center">아이스 브레이킹 중...</h2>
        <div className="gap-12" />
        <p className="subtitle text-center" style={{ fontWeight: 600 }}>
          {'팀원들이 서로 이야기할 수\n있도록 진행해주세요!'}
        </p>
      </InkCard>
      <div className="gap-22" />

      <Card className="card--pad-16">
        <div className="list__header">
          <h3 className="title">팀 진행 상황</h3>
          <span className={`badge ${connected ? 'badge--ok' : 'badge--warn'}`} title="실시간 동기화 상태">
            {connected ? '실시간' : '폴링'}
          </span>
          <span className="muted" style={{ fontWeight: 900 }}>
            {teams.length}팀
          </span>
        </div>
        <div className="gap-12" />
        {teams.length === 0 ? (
          <p className="empty-hint">팀 정보를 불러오는 중...</p>
        ) : (
          <div className="list">
            {teams.map((team) => {
              const status = TEAM_STATUS_LABEL[team.status]
              return (
                <div key={team.teamId} className="tile" style={{ alignItems: 'center' }}>
                  <span className="tile__index" style={{ marginTop: 0 }}>
                    {team.teamNo}
                  </span>
                  <span className="tile__text">
                    {team.name}
                    <span className="tile__meta">
                      {team.memberCount}명 · {team.category} · 질문 {team.questionCount}개
                    </span>
                  </span>
                  <span className={`badge ${status.tone}`}>{status.text}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <div className="gap-20" />
    </Page>
  )
}
