import {
  ArrowRight,
  AudioLines,
  FileText,
  House,
  Mic,
  Pencil,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  SkipForward,
  Square,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Badge, Card, Gap, Page } from '../components/Page'
import { FinalQuestionDeck, QuestionDeck, type PendingCard } from '../components/QuestionDeck'
import { describeError } from '../data/apiClient'
import { endpoints } from '../data/endpoints'
import { iceLinkApi } from '../data/iceLinkApi'
import type { RoomEventType, ServerEvent, TeamDetailResponse, TeamQuestionResponse, TeamSummaryResponse } from '../data/types'
import { usePolling } from '../hooks/usePolling'
import { useServerEvents } from '../hooks/useServerEvents'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const REFRESH_INTERVAL_MS = 2_000
const MAX_ANSWER_LENGTH = 3000

/**
 * 팀 세션 화면.
 *  - NAMING(INTRO) 단계: 팀명 수정 + "다음 질문 받기"(POST /questions/next)
 *  - QUESTIONING: 녹음/직접 입력 → 답변 제출(202) → PROCESSING 동안 갱신 → 새 질문
 *  - FAILED: 재시도 / 건너뛰기, 방 FINISHED: 주최자 마무리 질문 요약
 * 팀 SSE 스트림으로 다른 팀원의 조작이 이 화면에도 즉시 반영된다.
 */
export function TeamQuestionPage() {
  const params = useParams()
  const teamId = Number(params.teamId)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [team, setTeam] = useState<TeamDetailResponse | null>(null)
  const [question, setQuestion] = useState<TeamQuestionResponse | null>(null)
  /** 이 팀의 질문 이력(orderNo 오름차순). 카드 덱에서 지나온 질문을 다시 볼 수 있다. */
  const [history, setHistory] = useState<TeamQuestionResponse[]>([])
  const [summary, setSummary] = useState<TeamSummaryResponse | null>(null)
  const [teamNameDraft, setTeamNameDraft] = useState('')
  const [manualText, setManualText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingNext, setIsRequestingNext] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const recordingStartedAt = useRef<number | null>(null)
  const resetTranscriptRef = useRef<() => void>(() => undefined)
  const invalidTeamId = !Number.isFinite(teamId)
  const initError = invalidTeamId ? '잘못된 팀 주소입니다.' : loadError

  const speech = useSpeechRecognition('ko-KR')

  const nameSeeded = useRef(false)

  const applyTeam = useCallback((detail: TeamDetailResponse, questions?: TeamQuestionResponse[]) => {
    setTeam(detail)
    setQuestion(detail.currentQuestion)
    if (questions) {
      setHistory([...questions].sort((a, b) => a.orderNo - b.orderNo))
    } else if (detail.currentQuestion) {
      // 이력 없이 현재 질문만 받은 경우: 같은 질문이면 갱신, 새 질문이면 뒤에 붙인다
      const current = detail.currentQuestion
      setHistory((prev) => {
        const idx = prev.findIndex((q) => q.questionId === current.questionId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = current
          return next
        }
        return [...prev, current]
      })
    }
    if (!nameSeeded.current) {
      nameSeeded.current = true
      setTeamNameDraft(detail.isDefaultName ? '' : detail.name)
    }
  }, [])

  /** 팀 상세 + 질문 이력을 함께 읽는다 */
  const fetchTeamWithHistory = useCallback(async () => {
    const [detail, questions] = await Promise.all([
      iceLinkApi.fetchTeam(teamId),
      iceLinkApi.fetchQuestions(teamId).catch(() => undefined),
    ])
    return { detail, questions }
  }, [teamId])

  useEffect(() => {
    if (invalidTeamId) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        await iceLinkApi.startTeam(teamId)
      } catch (error) {
        if (import.meta.env.DEV) console.warn('startTeam skipped:', describeError(error))
      }
      try {
        const { detail, questions } = await fetchTeamWithHistory()
        if (!cancelled) applyTeam(detail, questions)
      } catch (error) {
        if (!cancelled) setLoadError(describeError(error, '팀 정보를 불러오지 못했습니다.'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [teamId, invalidTeamId, applyTeam, fetchTeamWithHistory])

  const isProcessing = question?.status === 'PROCESSING'
  const isGenerating =
    team?.status === 'QUESTIONING' &&
    question !== null &&
    question.status !== 'ANSWERING' &&
    question.status !== 'FAILED' &&
    question.status !== 'PROCESSING'
  const isFinished = team?.status === 'FINISHED'

  const reloadTeam = useCallback(async () => {
    const { detail, questions } = await fetchTeamWithHistory()
    applyTeam(detail, questions)
    if (detail.currentQuestion?.status === 'ANSWERING' || detail.currentQuestion?.status === 'FAILED') {
      setIsRequestingNext(false)
    }
  }, [fetchTeamWithHistory, applyTeam])

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
          setIsRequestingNext(true)
          setQuestion((prev) => (prev && prev.status === 'ANSWERING' ? { ...prev, status: 'SKIPPED' } : prev))
          setTeam((prev) => (prev && prev.status === 'NAMING' ? { ...prev, status: 'QUESTIONING' } : prev))
          void reloadTeam()
          return
        case 'ANSWER_PROCESSING':
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

  // ---- 팀명 ----
  const renameTeam = async () => {
    setIsRenaming(true)
    try {
      const result = await iceLinkApi.updateTeamName(teamId, teamNameDraft.trim())
      setTeam((prev) => (prev ? { ...prev, name: result.name, isDefaultName: result.isDefaultName } : prev))
      showToast('팀명을 바꿨어요', `이제 "${result.name}" 입니다.`, 'success')
    } catch (error) {
      showToast('팀명을 바꾸지 못했어요', describeError(error), 'error')
    } finally {
      setIsRenaming(false)
    }
  }

  // ---- 다음 질문 ----
  const requestNext = async (reason?: string) => {
    setIsRequestingNext(true)
    try {
      await iceLinkApi.requestNextQuestion(teamId, reason)
      setQuestion((prev) => (prev ? { ...prev, status: 'SKIPPED' } : prev))
      setTeam((prev) => (prev ? { ...prev, status: 'QUESTIONING' } : prev))
      resetTranscript()
    } catch (error) {
      showToast('다음 질문을 요청하지 못했어요', describeError(error), 'error')
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
      showToast('답변을 보내지 못했어요', describeError(error, '녹음된 텍스트를 서버로 보내지 못했습니다.'), 'error')
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
      showToast('재시도하지 못했어요', describeError(error), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- 렌더 ----
  if (initError) {
    return (
      <Page title="질문" centered>
        <Card className="items-center text-center" style={{ padding: 28 }}>
          <p className="text-[14px] font-medium text-danger">{initError}</p>
          <Gap size={5} />
          <Button variant="secondary" icon={House} onClick={() => navigate(routes.home)}>
            홈으로
          </Button>
        </Card>
      </Page>
    )
  }

  if (isFinished) {
    const finalQuestions = summary?.finalQuestions ?? []
    const questionCountDone = summary?.questionCount ?? team?.questionCount ?? 0
    return (
      <Page
        title="아이스 브레이킹 종료"
        footer={
          <Button icon={House} onClick={() => navigate(routes.home, { replace: true })}>
            메인으로 가기
          </Button>
        }
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink-soft">{team?.name ?? '팀'}</span>
          <Badge tone="neutral">진행한 질문 {questionCountDone}개</Badge>
        </div>
        <Gap size={3} />
        <div className="px-1">
          <span className="eyebrow">Final questions</span>
          <h2 className="display mt-2">{'아이스 브레이킹이 끝났어요.\n주최자의 마무리 질문입니다'}</h2>
        </div>
        <Gap size={6} />

        {finalQuestions.length === 0 ? (
          <Card className="items-center text-center" style={{ padding: 28 }}>
            <p className="text-[15px] font-medium text-ink">주최자가 등록한 마무리 질문이 없어요.</p>
            <p className="mt-1.5 text-[13px] text-muted">화면을 내려놓고 자유롭게 대화를 이어가세요.</p>
          </Card>
        ) : (
          <FinalQuestionDeck questions={finalQuestions} />
        )}

        {summary && summary.keywords.length > 0 && (
          <>
            <Gap size={6} />
            <Card style={{ padding: 18 }}>
              <span className="eyebrow">오늘 다룬 키워드</span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {summary.keywords.map((k) => (
                  <Badge key={k} tone="ok">
                    {k}
                  </Badge>
                ))}
              </div>
            </Card>
          </>
        )}
        <Gap size={6} />
      </Page>
    )
  }

  const isNaming = team?.status === 'NAMING' || question?.type === 'INTRO'
  const canAnswer = !!question && question.status === 'ANSWERING' && !isProcessing && !isSubmitting

  /** 덱 맨 위에 얹을 임시 카드: 질문을 준비·생성하는 동안만 */
  const pending: PendingCard | null =
    !team || !question
      ? { label: '질문을 준비하고 있어요' }
      : isProcessing
        ? { label: '답변을 정리하고 있어요', description: '키워드를 뽑아 다음 질문을 만드는 중이에요. 잠시만요.' }
        : question.status === 'SKIPPED' || isGenerating || isRequestingNext
          ? { label: '다음 질문을 만들고 있어요', description: 'AI가 팀의 관심사에 맞춰 질문을 고르고 있어요.' }
          : null

  /** 하단 고정 액션. 카드 덱을 앞뒤로 넘겨도 버튼 위치가 바뀌지 않도록 Page footer 에 둔다. */
  const actions =
    isNaming && team ? (
      <Button icon={ArrowRight} loading={isRequestingNext} onClick={() => requestNext()}>
        자기소개 끝, 다음 질문 받기
      </Button>
    ) : question?.status === 'FAILED' ? (
      <div className="flex gap-2.5">
        <Button icon={RotateCcw} loading={isSubmitting} onClick={retry} disabled={!question.retryable}>
          재시도
        </Button>
        <Button variant="secondary" icon={SkipForward} loading={isRequestingNext} onClick={() => requestNext('SKIP')}>
          건너뛰기
        </Button>
      </div>
    ) : (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2.5">
          <Button
            icon={speech.isListening ? Square : Mic}
            variant={speech.isListening ? 'secondary' : 'primary'}
            disabled={!speech.isSupported || !canAnswer}
            onClick={speech.isListening ? stopRecording : startRecording}
          >
            {speech.isListening ? '녹음 완료' : '녹음 시작'}
          </Button>
          <Button
            icon={Send}
            variant={speech.isListening ? 'primary' : answerText ? 'primary' : 'secondary'}
            loading={isSubmitting}
            disabled={!canAnswer || !answerText}
            onClick={submitAnswer}
          >
            {isProcessing ? '처리 중' : '답변 전송'}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={SkipForward}
          disabled={!canAnswer || isRequestingNext}
          onClick={() => requestNext('SKIP')}
        >
          이 질문 건너뛰기
        </Button>
      </div>
    )

  return (
    <Page title="팀 질문" footer={actions}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-ink-soft">{team?.name ?? '팀'}</span>
        <Badge tone={sseConnected ? 'ok' : 'warn'} title="팀원 간 실시간 동기화 상태">
          {sseConnected ? <Radio size={11} /> : <RefreshCw size={11} />}
          {sseConnected ? '실시간' : '폴링'}
        </Badge>
      </div>
      <Gap size={3} />
      <QuestionDeck
        questions={history}
        pending={pending}
        questionCount={team?.questionCount ?? 0}
        questionLimit={team?.questionLimit ?? 15}
        footer={
          question?.status === 'FAILED' ? (
            <p className="px-1 text-center text-[13px] font-medium text-danger">
              AI 질문 생성에 실패했어요. 다시 시도하거나 건너뛸 수 있어요.
            </p>
          ) : undefined
        }
      />
      <Gap size={6} />

      {isNaming && team ? (
        <>
          <Card className="gap-3">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em]">
              <Pencil size={16} className="text-accent" />
              팀명 정하기
              <span className="text-[12px] font-medium text-faint">선택</span>
            </span>
            <div className="flex gap-2">
              <input
                className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-[15px] font-medium shadow-sm outline-none transition-all duration-200 placeholder:text-faint hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/[0.08]"
                placeholder={`비워 두면 "${team.teamNo}팀"`}
                maxLength={20}
                value={teamNameDraft}
                onChange={(e) => setTeamNameDraft(e.target.value)}
              />
              <Button variant="secondary" size="sm" block={false} loading={isRenaming} onClick={renameTeam} className="h-12 px-5">
                저장
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {team.members.map((m) => (
                <Badge key={m.participantId} tone="neutral">
                  {m.nickname}
                </Badge>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card className="gap-3">
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold tracking-[-0.01em]">
              {speech.isListening ? (
                <AudioLines size={16} className="animate-pulse text-accent" />
              ) : (
                <FileText size={16} className="text-accent" />
              )}
              {speech.isListening ? '실시간 인식 중' : '대화 텍스트'}
              {!speech.isListening && <span className="text-[12px] font-medium text-faint">수정 가능</span>}
            </span>
            {speech.isListening ? (
              <p className={`min-h-[112px] text-[15px] leading-relaxed whitespace-pre-wrap ${speech.liveText ? 'text-ink' : 'text-faint'}`}>
                {speech.liveText || '말씀해 주세요. 인식된 내용이 여기에 표시돼요.'}
              </p>
            ) : (
              <textarea
                className="min-h-[112px] w-full resize-y rounded-xl border border-line bg-paper/60 px-4 py-3 text-[15px] leading-relaxed outline-none transition-all duration-200 placeholder:text-faint hover:border-line-strong focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/[0.08] disabled:opacity-50"
                placeholder={
                  speech.isSupported
                    ? '녹음을 시작하면 인식 결과가 여기에 담겨요. 직접 입력해도 됩니다.'
                    : '이 브라우저는 음성 인식을 지원하지 않아요. 대화 내용을 직접 입력해 주세요.'
                }
                rows={4}
                maxLength={MAX_ANSWER_LENGTH}
                value={manualText || speech.liveText}
                disabled={isProcessing || isSubmitting}
                onChange={(e) => setManualText(e.target.value)}
              />
            )}
            {speech.error && <p className="text-[13px] font-medium text-danger">{speech.error}</p>}
          </Card>
        </>
      )}
      <Gap size={4} />
    </Page>
  )
}
