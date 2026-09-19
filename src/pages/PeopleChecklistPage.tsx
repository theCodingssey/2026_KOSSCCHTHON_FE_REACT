import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Card, InkCard, Page } from '../components/Page'
import { appConstants } from '../core/config'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { HostParticipantResponse, ParticipantStatus, RoomEventType } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'

const STATUS_LABEL: Record<ParticipantStatus, { text: string; tone: string }> = {
  JOINED: { text: '설문 중', tone: 'badge--warn' },
  SURVEY_DONE: { text: '설문 완료', tone: 'badge--ok' },
  ASSIGNED: { text: '배정됨', tone: 'badge--info' },
  LATE: { text: '늦참', tone: '' },
  LEFT: { text: '나감', tone: '' },
}

/** Flutter `PeopleChecklist` + `PeopleChecklistController`. 3초 주기로 참가자 목록을 갱신한다. */
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

  /** 주최자 SSE 스트림 (RT-01): 참가 입장·설문 완료·나가기 이벤트마다 목록을 다시 읽는다 */
  const handleEvent = useCallback(
    (type: RoomEventType) => {
      if (type === 'PARTICIPANT_JOINED' || type === 'PARTICIPANT_LEFT' || type === 'PARTICIPANT_SURVEY_DONE') {
        void loadParticipants().catch(() => undefined)
      }
    },
    [loadParticipants],
  )
  const { connected } = useServerEvents(code ? endpoints.hostRoomEvents(code) : null, handleEvent)

  // 첫 진입 1회 + SSE 미연결 동안만 3초 폴링
  usePolling(loadParticipants, appConstants.pollIntervalMs, !isStarting && !connected)

  const surveyDoneCount = participants.filter((p) => p.status === 'SURVEY_DONE').length

  const startIceBreaking = async () => {
    setIsStarting(true)
    try {
      await iceLinkApi.startTeamBuilding(code)
      navigate(routes.iceBreaking(code))
    } catch (error) {
      showToast('팀 빌딩 실패', describeError(error, '참가자 설문 완료 상태를 확인해주세요.'), 'error')
      setIsStarting(false)
    }
  }

  return (
    <Page
      title="참가자 명단 확인하기"
      footer={
        <Button icon="play_arrow" loading={isStarting} onClick={startIceBreaking}>
          {isStarting ? '시작 중...' : '시작하기!'}
        </Button>
      }
    >
      <InkCard className="card--pad-20" >
        <span className="eyebrow">참가용 핀</span>
        <div className="gap-10" />
        <span className="pin-text">{code}</span>
      </InkCard>
      <div className="gap-22" />

      <Card className="card--pad-16">
        <div className="list__header">
          <h2 className="title">참가자 명단</h2>
          <span className={`badge ${connected ? 'badge--ok' : 'badge--warn'}`} title="실시간 동기화 상태">
            {connected ? '실시간' : '폴링'}
          </span>
          <span className="muted" style={{ fontWeight: 900 }}>
            {participants.length}명
            {participants.length > 0 && (
              <span className="caption" style={{ marginLeft: 6 }}>
                (설문 완료 {surveyDoneCount})
              </span>
            )}
          </span>
        </div>
        <div className="gap-12" />
        {!loaded ? (
          <p className="empty-hint">참가자 목록을 불러오는 중...</p>
        ) : participants.length === 0 ? (
          <p className="empty-hint">아직 참가자가 없습니다. 핀을 공유해 주세요.</p>
        ) : (
          <div className="list">
            {participants.map((p, index) => {
              const status = STATUS_LABEL[p.status]
              return (
                <div key={p.participantId} className="tile" style={{ alignItems: 'center' }}>
                  <span className="tile__index tile__index--soft" style={{ marginTop: 0 }}>
                    {index + 1}
                  </span>
                  <span className="tile__text">{p.nickname}</span>
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
