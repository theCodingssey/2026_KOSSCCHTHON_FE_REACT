import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Card, InkCard, Page } from '../components/Page'
import { describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'
import { endpoints } from '../data/endpoints'
import type { RoomEventType, ServerEvent, TeamDetailResponse, TeamQuestionResponse, TeamSummaryResponse } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const REFRESH_INTERVAL_MS = 2_000
const MAX_ANSWER_LENGTH = 3000

/**
 * Flutter `TeamQuestionPage` + `TeamQuestionController`.
 *
 * 서버 규칙에 맞춰 흐름을 보정했다:
 *  - NAMING(INTRO 질문) 단계에서는 답변 대신 팀명 수정 + "다음 질문 받기"(POST /questions/next)
 *  - QUESTIONING 단계에서 녹음/직접 입력 → 답변 제출(202) → PROCESSING 동안 2초 폴링 → 새 질문 도착
 *  - FAILED 면 재시도, 방이 FINISHED 되면 주최자 마무리 질문 요약을 표시
 */
export function TeamQuestionPage() {
  const params = useParams()
  const teamId = Number(params.teamId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [team, setTeam] = useState<TeamDetailResponse | null>(null)
  const [question, setQuestion] = useState<TeamQuestionResponse | null>(null)
  const [summary, setSummary] = useState<TeamSummaryResponse | null>(null)
  const [teamNameDraft, setTeamNameDraft] = useState('')
  const [manualText, setManualText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingNext, setIsRequestingNext] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const recordingStartedAt = useRef<number | null>(null)
  // SSE 핸들러(useCallback)에서 최신 resetTranscript 를 부르기 위한 참조 (아래에서 채움)
  const resetTranscriptRef = useRef<() => void>(() => undefined)
  const invalidTeamId = !Number.isFinite(teamId)
  const initError = invalidTeamId ? '잘못된 팀 주소입니다.' : loadError

  const speech = useSpeechRecognition('ko-KR')

  // 팀 이름 입력란은 서버 값으로 한 번만 채운다
  const nameSeeded = useRef(false)

  const applyTeam = useCallback((detail: TeamDetailResponse) => {
    setTeam(detail)
    setQuestion(detail.currentQuestion)
    if (!nameSeeded.current) {
      nameSeeded.current = true
      setTeamNameDraft(detail.isDefaultName ? '' : detail.name)
    }
  }, [])

  /** Flutter `_prepareRemoteQuestion`: start(멱등) → currentQuestion, 실패 시 fetchTeam */
  useEffect(() => {
    if (invalidTeamId) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await iceLinkApi.startTeam(teamId)
      } catch (error) {
        // 방이 IN_PROGRESS 가 아니거나(종료됨) 등. 아래 fetchTeam 으로 실제 상태를 보여준다.
        if (import.meta.env.DEV) console.warn('startTeam skipped:', describeError(error))
      }
      try {
        const detail = await iceLinkApi.fetchTeam(teamId)
        if (!cancelled) applyTeam(detail)
      } catch (error) {
        if (!cancelled) setLoadError(describeError(error, '팀 정보를 불러오지 못했습니다.'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teamId, invalidTeamId, applyTeam])

  const isProcessing = question?.status === 'PROCESSING'
  const isGenerating = team?.status === 'QUESTIONING' && question !== null && question.status !== 'ANSWERING'
    && question.status !== 'FAILED' && question.status !== 'PROCESSING'
  const isFinished = team?.status === 'FINISHED'

  /** 팀 상태를 서버에서 다시 읽는다. SSE 이벤트 수신 시와 폴링 폴백에서 공용. */
  const reloadTeam = useCallback(async () => {
    const detail = await iceLinkApi.fetchTeam(teamId)
    applyTeam(detail)
    if (detail.currentQuestion?.status === 'ANSWERING' || detail.currentQuestion?.status === 'FAILED') {
      setIsRequestingNext(false)
    }
  }, [teamId, applyTeam])

  /**
   * 팀 SSE 스트림 (RT-03): 다른 팀원이 팀명을 바꾸거나 다음 질문을 요청하거나 답변을 보내면
   * 이 화면도 같은 이벤트를 받아 즉시 갱신된다. 주최자가 방을 끝내면 ROOM_FINISHED 가 온다.
   */
  const handleTeamEvent = useCallback(
    (type: RoomEventType, event: ServerEvent) => {
      switch (type) {
        case 'TEAM_NAME_CHANGED': {
          const name = String(event.payload.name ?? '')
          const isDefaultName = Boolean(event.payload.isDefaultName)
          setTeam((prev) => (prev ? { ...prev, name, isDefaultName } : prev))
          if (!isRenaming) {
            setTeamNameDraft(isDefaultName ? '' : name)
          }
          return
        }
        case 'QUESTION_GENERATING':
          // 다른 팀원이 "다음 질문"을 눌렀다 → 내 화면도 생성 중으로 전환
          setIsRequestingNext(true)
          setQuestion((prev) => (prev && prev.status === 'ANSWERING' ? { ...prev, status: 'SKIPPED' } : prev))
          setTeam((prev) => (prev && prev.status === 'NAMING' ? { ...prev, status: 'QUESTIONING' } : prev))
          void reloadTeam()
          return
        case 'ANSWER_PROCESSING':
          // 다른 팀원이 답변을 제출했다 → 내 화면도 "처리 중"
          setQuestion((prev) => (prev ? { ...prev, status: 'PROCESSING' } : prev))
          resetTranscriptRef.current()
          void reloadTeam()
          return
        case 'TEAM_STARTED':
        case 'QUESTION_CREATED':
        case 'ANSWER_PROCESSED':
        case 'ANSWER_FAILED':
        case 'ROOM_FINISHED':
          void reloadTeam()
          return
        default:
          return
      }
    },
    [isRenaming, reloadTeam],
  )

  const { connected: sseConnected } = useServerEvents(
    invalidTeamId ? null : endpoints.teamEvents(teamId),
    handleTeamEvent,
  )

  /**
   * 폴링 폴백 (RT-04): SSE 가 끊긴 동안만. 처리·생성 중이면 2초, 그 외엔 방 종료 감지용으로 느리게.
   * (Flutter `_refreshCurrentQuestionAfterDelay` 확장)
   */
  const busy = !isFinished && (isProcessing || isGenerating || isRequestingNext) && !isSubmitting
  usePolling(reloadTeam, REFRESH_INTERVAL_MS, !sseConnected && busy)
  usePolling(reloadTeam, 5_000, !sseConnected && !busy && !isFinished)

  useEffect(() => {
    if (!isFinished || summary) return
    iceLinkApi
      .fetchTeamSummary(teamId)
      .then(setSummary)
      .catch(() => undefined)
  }, [isFinished, summary, teamId])

  // ---- 팀명 (Q-02, Q-03) ----
  const renameTeam = async () => {
    setIsRenaming(true)
    try {
      const result = await iceLinkApi.updateTeamName(teamId, teamNameDraft.trim())
      setTeam((prev) => (prev ? { ...prev, name: result.name, isDefaultName: result.isDefaultName } : prev))
      showToast('팀명 변경 완료', `이제 "${result.name}" 입니다.`, 'success')
    } catch (error) {
      showToast('팀명 변경 실패', describeError(error), 'error')
    } finally {
      setIsRenaming(false)
    }
  }

  // ---- 다음 질문 (NAMING → QUESTIONING, 또는 건너뛰기) ----
  const requestNext = async (reason?: string) => {
    setIsRequestingNext(true)
    try {
      await iceLinkApi.requestNextQuestion(teamId, reason)
      setQuestion((prev) => (prev ? { ...prev, status: 'SKIPPED' } : prev))
      setTeam((prev) => (prev ? { ...prev, status: 'QUESTIONING' } : prev))
      resetTranscript()
    } catch (error) {
      showToast('다음 질문 요청 실패', describeError(error), 'error')
      setIsRequestingNext(false)
    }
  }

  // ---- 녹음 / 답변 ----
  const resetTranscript = () => {
    speech.reset()
    setManualText('')
    recordingStartedAt.current = null
  }
  useEffect(() => {
    resetTranscriptRef.current = resetTranscript
  })

  const startRecording = () => {
    recordingStartedAt.current = Date.now()
    speech.start()
  }

  const stopRecording = () => {
    speech.stop()
    // 인식 결과를 편집 가능한 입력창으로 넘긴다 (Flutter savedText)
    if (speech.liveText.trim()) {
      setManualText(speech.liveText.trim())
    }
  }

  const answerText = (manualText || speech.liveText).trim()

  const submitAnswer = async () => {
    if (!question || !answerText) {
      showToast('답변이 비어 있어요', '녹음하거나 직접 입력한 뒤 전송해 주세요.')
      return
    }
    if (speech.isListening) speech.stop()

    setIsSubmitting(true)
    try {
      const durationSec = recordingStartedAt.current
        ? Math.min(600, Math.max(0, Math.round((Date.now() - recordingStartedAt.current) / 1000)))
        : undefined
      await iceLinkApi.submitAnswer(teamId, question.questionId, {
        answerText: answerText.slice(0, MAX_ANSWER_LENGTH),
        speechDurationSec: durationSec,
      })
      setQuestion((prev) => (prev ? { ...prev, status: 'PROCESSING' } : prev))
      resetTranscript()
    } catch (error) {
      showToast('답변 전송 실패', describeError(error, '녹음된 텍스트를 서버로 보내지 못했습니다.'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const retry = async () => {
    if (!question) return
    setIsSubmitting(true)
    try {
      await iceLinkApi.retryQuestion(teamId, question.questionId)
      setQuestion((prev) => (prev ? { ...prev, status: 'PROCESSING' } : prev))
    } catch (error) {
      showToast('재시도 실패', describeError(error), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- 렌더 ----
  if (initError) {
    return (
      <Page title="질문" centered>
        <Card className="card--center">
          <p className="error-text">{initError}</p>
          <div className="gap-16" />
          <Button variant="outlined" icon="home" onClick={() => navigate(routes.home)}>
            홈으로
          </Button>
        </Card>
      </Page>
    )
  }

  if (isFinished) {
    const finalQuestions = summary?.finalQuestions ?? []
    return (
      <Page title="아이스 브레이킹 종료">
        <InkCard>
          <span className="eyebrow">FINAL QUESTIONS</span>
          <div className="gap-12" />
          <h2 className="question-text" style={{ fontSize: 26 }}>
            {team?.name} · 주최자의 마무리 질문
          </h2>
          <div className="gap-8" />
          <p className="subtitle">진행한 질문 {summary?.questionCount ?? team?.questionCount ?? 0}개</p>
        </InkCard>
        <div className="gap-18" />
        <Card>
          {finalQuestions.length === 0 ? (
            <p className="empty-hint">주최자가 등록한 마무리 질문이 없습니다. 자유롭게 대화를 이어가세요!</p>
          ) : (
            <div className="list">
              {finalQuestions.map((q, index) => (
                <div key={`${index}-${q}`} className="tile">
                  <span className="tile__index">{index + 1}</span>
                  <span className="tile__text" style={{ paddingTop: 6 }}>
                    {q}
                  </span>
                </div>
              ))}
            </div>
          )}
          {summary && summary.keywords.length > 0 && (
            <>
              <div className="gap-16" />
              <span className="caption">다룬 키워드</span>
              <div className="gap-8" />
              <div className="keywords">
                {summary.keywords.map((k) => (
                  <span key={k} className="keyword">
                    {k}
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
        <div className="gap-24" />
        <Button icon="home" onClick={() => navigate(routes.home, { replace: true })}>
          메인으로 가기
        </Button>
      </Page>
    )
  }

  const isNaming = team?.status === 'NAMING' || question?.type === 'INTRO'
  const headline =
    !team || !question
      ? '질문을 준비하고 있어요...'
      : isProcessing
        ? '질문 생성 중...'
        : question.status === 'SKIPPED' || isGenerating || isRequestingNext
          ? '다음 질문을 만들고 있어요...'
          : question.content

  return (
    <Page title="질문">
      <InkCard className="card--pad-24">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">TEAM QUESTION</span>
          {team && (
            <span style={{ display: 'flex', gap: 6 }}>
              <span className="badge badge--info">
                {team.name} · {team.questionCount}/{team.questionLimit}
              </span>
              <span className={`badge ${sseConnected ? 'badge--ok' : 'badge--warn'}`} title="팀원 간 실시간 동기화 상태">
                {sseConnected ? '실시간' : '폴링'}
              </span>
            </span>
          )}
        </div>
        <div className="gap-18" />
        <h2 className="question-text">{headline}</h2>
        {question?.status === 'FAILED' && (
          <>
            <div className="gap-12" />
            <p className="subtitle" style={{ color: '#ffb4ab' }}>
              AI 질문 생성에 실패했습니다. 다시 시도하거나 건너뛸 수 있어요.
            </p>
          </>
        )}
      </InkCard>
      <div className="gap-18" />

      {isNaming && team ? (
        <>
          <Card>
            <span className="transcript-header">
              <Icon name="edit" />
              팀명 정하기 (선택)
            </span>
            <div className="gap-12" />
            <div className="team-name-row">
              <input
                className="input"
                placeholder={`비워 두면 "${team.teamNo}팀"`}
                maxLength={20}
                value={teamNameDraft}
                onChange={(e) => setTeamNameDraft(e.target.value)}
              />
              <Button variant="outlined" loading={isRenaming} onClick={renameTeam}>
                저장
              </Button>
            </div>
            <div className="gap-12" />
            <p className="subtitle" style={{ fontSize: 14 }}>
              팀원: {team.members.map((m) => m.nickname).join(', ')}
            </p>
          </Card>
          <div className="spacer" />
          <Button icon="arrow_forward" loading={isRequestingNext} onClick={() => requestNext()}>
            자기소개 끝! 다음 질문 받기
          </Button>
        </>
      ) : (
        <>
          <Card>
            <span className="transcript-header">
              <Icon name={speech.isListening ? 'graphic_eq' : 'article'} />
              {speech.isListening ? '실시간 인식 중' : '음성 텍스트 (수정 가능)'}
            </span>
            <div className="gap-12" />
            {speech.isListening ? (
              <p className={`transcript-text${speech.liveText ? '' : ' transcript-text--empty'}`}>
                {speech.liveText || '말씀해 주세요. 인식된 내용이 여기에 표시됩니다.'}
              </p>
            ) : (
              <textarea
                className="textarea"
                placeholder={
                  speech.isSupported
                    ? '녹음을 시작하면 실시간 음성 인식 결과가 여기에 표시됩니다. 직접 입력해도 됩니다.'
                    : '이 브라우저는 음성 인식을 지원하지 않습니다. 대화 내용을 직접 입력해 주세요.'
                }
                rows={4}
                maxLength={MAX_ANSWER_LENGTH}
                value={manualText || speech.liveText}
                disabled={isProcessing || isSubmitting}
                onChange={(e) => setManualText(e.target.value)}
              />
            )}
            {speech.error && (
              <>
                <div className="gap-12" />
                <p className="error-text">{speech.error}</p>
              </>
            )}
          </Card>
          <div className="spacer" />

          {question?.status === 'FAILED' ? (
            <div className="inline-actions">
              <Button icon="refresh" loading={isSubmitting} onClick={retry} disabled={!question.retryable}>
                재시도
              </Button>
              <Button variant="outlined" icon="skip_next" loading={isRequestingNext} onClick={() => requestNext('SKIP')}>
                건너뛰기
              </Button>
            </div>
          ) : (
            <>
              <div className="inline-actions">
                <Button
                  icon={speech.isListening ? 'stop' : 'mic'}
                  variant={speech.isListening ? 'outlined' : 'filled'}
                  disabled={!speech.isSupported || isProcessing || isSubmitting || !question || question.status !== 'ANSWERING'}
                  onClick={speech.isListening ? stopRecording : startRecording}
                >
                  {speech.isListening ? '녹음 완료' : '녹음 시작'}
                </Button>
                <Button
                  icon="send"
                  loading={isSubmitting}
                  disabled={isProcessing || !answerText || !question || question.status !== 'ANSWERING'}
                  onClick={submitAnswer}
                >
                  {isProcessing ? '처리 중' : '답변 전송'}
                </Button>
              </div>
              <div className="gap-10" />
              <Button
                variant="text"
                icon="skip_next"
                small
                disabled={isProcessing || isSubmitting || isRequestingNext || !question || question.status !== 'ANSWERING'}
                onClick={() => requestNext('SKIP')}
              >
                이 질문 건너뛰기
              </Button>
            </>
          )}
        </>
      )}
      <div className="gap-16" />
    </Page>
  )
}
