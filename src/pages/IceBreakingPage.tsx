import { CheckCheck, Radio, RefreshCw, Users } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Badge, Card, Gap, IndexDot, InkCard, ListRow, Page } from '../components/Page'
import { appConstants } from '../core/config'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { RoomEventType, RoomTeamSummary, TeamStatus } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

const TEAM_STATUS_LABEL: Record<TeamStatus, { text: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  NOT_STARTED: { text: '모이는 중', tone: 'warn' },
  NAMING: { text: '팀명 정하기', tone: 'info' },
  QUESTIONING: { text: '질문 진행', tone: 'ok' },
  FINISHED: { text: '종료', tone: 'neutral' },
}

const CATEGORY_LABEL: Record<RoomTeamSummary['category'], string> = {
  MOVIE: '영화',
  GAME: '게임',
  FOOD: '음식',
  TRAVEL: '여행',
  SPORTS: '스포츠',
}

/** 주최자: 팀 진행 상황 모니터링 → 종료 */
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

  const handleEvent = useCallback(
    (type: RoomEventType) => {
      if (type.startsWith('TEAM_') || type.startsWith('QUESTION_') || type === 'ROOM_FINISHED') {
        void loadRoom().catch(() => undefined)
      }
    },
    [loadRoom],
  )
  const { connected } = useServerEvents(code ? endpoints.hostRoomEvents(code) : null, handleEvent)

  usePolling(loadRoom, appConstants.pollIntervalMs, !isFinishing && !connected)

  const finishIceBreaking = async () => {
    setIsFinishing(true)
    try {
      await iceLinkApi.finishRoom(code)
      void refresh().catch(() => undefined)
      navigate(routes.iceBreakingComplete(code), { replace: true })
    } catch (error) {
      showToast('종료하지 못했어요', describeError(error, '아이스 브레이킹을 종료하지 못했습니다.'), 'error')
      setIsFinishing(false)
    }
  }

  const activeCount = teams.filter((t) => t.status === 'QUESTIONING').length

  return (
    <Page
      title="아이스 브레이킹"
      footer={
        <Button icon={CheckCheck} loading={isFinishing} onClick={finishIceBreaking}>
          마무리 질문 제시하고 종료하기
        </Button>
      }
    >
      <InkCard className="items-center text-center" style={{ padding: 28 }}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <Users size={26} strokeWidth={1.75} />
        </span>
        <h2 className="display mt-5">아이스 브레이킹 중</h2>
        <p className="mt-3 max-w-[30ch] text-[14px] leading-relaxed text-white/60">
          팀원들이 서로 이야기할 수 있도록 진행해 주세요. 종료하면 모든 팀에 마무리 질문이 표시돼요.
        </p>
      </InkCard>
      <Gap size={5} />

      <Card style={{ paddingTop: 16, paddingBottom: 12 }}>
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">팀 진행 상황</h2>
          <Badge tone={connected ? 'ok' : 'warn'} title="실시간 동기화 상태">
            {connected ? <Radio size={11} /> : <RefreshCw size={11} />}
            {connected ? '실시간' : '폴링'}
          </Badge>
          <span className="text-[13px] text-muted tabular">
            <span className="font-semibold text-ink">{teams.length}</span>팀
            {teams.length > 0 && <span className="text-faint"> · 진행 {activeCount}</span>}
          </span>
        </div>
        <Gap size={2} />
        {teams.length === 0 ? (
          <p className="px-0.5 py-6 text-center text-[13px] text-muted">팀 정보를 불러오는 중…</p>
        ) : (
          <div className="hairline">
            {teams.map((team) => {
              const status = TEAM_STATUS_LABEL[team.status]
              return (
                <ListRow
                  key={team.teamId}
                  leading={<IndexDot tone="ink">{team.teamNo}</IndexDot>}
                  title={team.name}
                  subtitle={`${team.memberCount}명 · ${CATEGORY_LABEL[team.category]} · 질문 ${team.questionCount}개`}
                  trailing={<Badge tone={status.tone}>{status.text}</Badge>}
                />
              )
            })}
          </div>
        )}
      </Card>
      <Gap size={6} />
    </Page>
  )
}
