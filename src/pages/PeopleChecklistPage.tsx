import { Play, Radio, RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Badge, Card, Gap, IndexDot, InkCard, ListRow, Page } from '../components/Page'
import { appConstants } from '../core/config'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { HostParticipantResponse, ParticipantStatus, RoomEventType } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

const STATUS_LABEL: Record<ParticipantStatus, { text: string; tone: 'ok' | 'warn' | 'info' | 'neutral' }> = {
  JOINED: { text: '설문 중', tone: 'warn' },
  SURVEY_DONE: { text: '설문 완료', tone: 'ok' },
  ASSIGNED: { text: '배정됨', tone: 'info' },
  LATE: { text: '늦참', tone: 'neutral' },
  LEFT: { text: '나감', tone: 'neutral' },
}

/** 주최자: 참가자 명단 실시간 확인 → 팀 빌딩 시작 */
export function PeopleChecklistPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [participants, setParticipants] = useState<HostParticipantResponse[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const loadParticipants = useCallback(async () => {
    const list = await iceLinkApi.fetchHostParticipants(code)
    setParticipants(list)
    setLoaded(true)
  }, [code])

  const handleEvent = useCallback(
    (type: RoomEventType) => {
      if (type === 'PARTICIPANT_JOINED' || type === 'PARTICIPANT_LEFT' || type === 'PARTICIPANT_SURVEY_DONE') {
        void loadParticipants().catch(() => undefined)
      }
    },
    [loadParticipants],
  )
  const { connected } = useServerEvents(code ? endpoints.hostRoomEvents(code) : null, handleEvent)

  usePolling(loadParticipants, appConstants.pollIntervalMs, !isStarting && !connected)

  const surveyDoneCount = participants.filter((p) => p.status === 'SURVEY_DONE').length

  const startIceBreaking = async () => {
    setIsStarting(true)
    try {
      await iceLinkApi.startTeamBuilding(code)
      navigate(routes.iceBreaking(code))
    } catch (error) {
      showToast('팀 빌딩을 시작하지 못했어요', describeError(error, '참가자 설문 완료 상태를 확인해 주세요.'), 'error')
      setIsStarting(false)
    }
  }

  return (
    <Page
      title="참가자 명단"
      footer={
        <Button icon={Play} loading={isStarting} onClick={startIceBreaking} disabled={surveyDoneCount < 2}>
          {isStarting ? '팀을 나누는 중…' : '팀 빌딩 시작하기'}
        </Button>
      }
    >
      <InkCard className="gap-2" style={{ padding: 24 }}>
        <span className="text-[12px] font-semibold tracking-[0.1em] text-white/60">참가용 핀</span>
        <div className="text-[44px] font-semibold leading-none tracking-[0.06em] tabular">{code}</div>
        <p className="mt-2 text-[13px] text-white/60">참가자가 핀을 입력하고 설문을 마치면 여기에 표시돼요.</p>
      </InkCard>
      <Gap size={5} />

      <Card style={{ paddingTop: 16, paddingBottom: 12 }}>
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="flex-1 text-[15px] font-semibold tracking-[-0.01em]">참가자</h2>
          <Badge tone={connected ? 'ok' : 'warn'} title="실시간 동기화 상태">
            {connected ? <Radio size={11} /> : <RefreshCw size={11} />}
            {connected ? '실시간' : '폴링'}
          </Badge>
          <span className="text-[13px] text-muted tabular">
            <span className="font-semibold text-ink">{participants.length}</span>명
            {participants.length > 0 && <span className="text-faint"> · 설문 완료 {surveyDoneCount}</span>}
          </span>
        </div>
        <Gap size={2} />
        {!loaded ? (
          <p className="px-0.5 py-6 text-center text-[13px] text-muted">참가자 목록을 불러오는 중…</p>
        ) : participants.length === 0 ? (
          <p className="px-0.5 py-6 text-center text-[13px] text-muted">아직 참가자가 없어요. 핀을 공유해 주세요.</p>
        ) : (
          <div className="hairline">
            {participants.map((p, index) => {
              const status = STATUS_LABEL[p.status]
              return (
                <ListRow
                  key={p.participantId}
                  leading={<IndexDot>{index + 1}</IndexDot>}
                  title={p.nickname}
                  trailing={<Badge tone={status.tone}>{status.text}</Badge>}
                />
              )
            })}
          </div>
        )}
      </Card>
      {surveyDoneCount < 2 && loaded && (
        <p className="mt-3 text-center text-[12px] text-faint">설문을 마친 참가자가 2명 이상이면 시작할 수 있어요.</p>
      )}
      <Gap size={6} />
    </Page>
  )
}
