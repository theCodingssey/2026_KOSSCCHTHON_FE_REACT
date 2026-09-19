import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { Card, Page } from '../components/Page'
import { TextField } from '../components/TextField'
import { ApiError, describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'
import type { InterestCategory } from '../data/types'

/** Flutter `JoinRoomController.questions` (프론트 하드코딩 6문항) */
const QUESTIONS = [
  '나는 함께 있는 것을 좋아한다.',
  '나는 새로운 사람들과 만나는 것이 편하다.',
  '나는 파티나 모임에서\n주도적으로 대화를 이끈다.',
  '나는 사람들과 함께 있을 때\n에너지를 얻는다.',
  '나는 많은 사람들과 친구로\n지내는 것을 선호한다.',
  '나는 생각하기 전에 먼저 말하는 편이다.',
] as const

/** 왼쇽(index 0) = 매우 맞음 = 5점 … 오른쪽(index 4) = 매우 아님 = 1점 */
const ANSWER_OPTIONS = ['매우 맞음', '맞음', '보통', '아님', '매우 아님'] as const

const HOBBIES: { label: string; code: InterestCategory; icon: string }[] = [
  { label: '게임', code: 'GAME', icon: 'sports_esports' },
  { label: '여행', code: 'TRAVEL', icon: 'flight_takeoff' },
  { label: '음식', code: 'FOOD', icon: 'restaurant' },
  { label: '스포츠', code: 'SPORTS', icon: 'sports_soccer' },
  { label: '영화', code: 'MOVIE', icon: 'movie' },
]

function answerTone(index: number): string {
  if (index < 2) return 'scale__dot--positive'
  if (index === 2) return 'scale__dot--neutral'
  return 'scale__dot--negative'
}

/** Flutter `JoinRoomPage` + `JoinRoomController.generateTeamNumber` */
export function JoinRoomPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { refresh } = useSession()

  const [pin, setPin] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [hobby, setHobby] = useState<InterestCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSurveyComplete =
    pin.trim().length > 0 && Object.keys(answers).length === QUESTIONS.length && hobby !== null

  const submit = async () => {
    if (!isSurveyComplete || hobby === null) {
      showToast('아직 덜 골랐어요', '핀, 6개 설문, 취미를 모두 선택해주세요.')
      return
    }

    const code = pin.trim().toUpperCase()
    setIsSubmitting(true)
    try {
      await iceLinkApi.joinRoom(code)
      await iceLinkApi.submitSurvey(code, {
        personality: QUESTIONS.map((_, index) => ({ no: index + 1, score: 5 - answers[index] })),
        interestCategory: hobby,
      })
      void refresh().catch(() => undefined)

      const team = await iceLinkApi.fetchMyTeam(code)
      navigate(team ? routes.teamNumber(code) : routes.teamBuildingWait(code), { replace: true })
    } catch (error) {
      const hint =
        error instanceof ApiError && error.code === 'ALREADY_IN_ANOTHER_ROOM'
          ? `이미 다른 방(${String(error.problem?.activeRoomCode ?? '')})에 참가 중입니다. 홈의 디버그 버튼으로 먼저 나가 주세요.`
          : describeError(error, '방 코드와 서버 상태를 확인해주세요.')
      showToast('방 참가 실패', hint, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page title="방 참가하기">
      <h1 className="headline">방 핀과 설문을 입력하세요!</h1>
      <div className="gap-10" />
      <p className="subtitle">성격 질문에 답하고 취미를 하나 선택해주세요.</p>
      <div className="gap-20" />

      <TextField
        label="방 핀"
        icon="pin"
        placeholder="예: K7M3PQ"
        value={pin}
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
        onChange={(e) => setPin(e.target.value.toUpperCase())}
      />
      <div className="gap-22" />

      {QUESTIONS.map((question, qIndex) => (
        <div key={question}>
          <Card className="card--pad-16" style={{ borderRadius: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, whiteSpace: 'pre-line' }}>{question}</h2>
            <div className="gap-12" />
            <div className="scale" role="radiogroup" aria-label={question}>
              {ANSWER_OPTIONS.map((label, aIndex) => {
                const selected = answers[qIndex] === aIndex
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={label}
                    title={label}
                    className={`scale__dot ${answerTone(aIndex)}${selected ? ' scale__dot--selected' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: aIndex }))}
                  >
                    {selected && <Icon name="check" size={16} />}
                  </button>
                )
              })}
            </div>
            <div className="scale__labels">
              <span className="caption">매우 맞음</span>
              <span className="caption">매우 아님</span>
            </div>
          </Card>
          <div className="gap-16" />
        </div>
      ))}

      <div className="gap-4" />
      <h2 className="title">취미 선택</h2>
      <div className="gap-12" />
      <div className="chips" role="radiogroup" aria-label="취미 선택">
        {HOBBIES.map((item) => {
          const selected = hobby === item.code
          return (
            <button
              key={item.code}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`chip${selected ? ' chip--selected' : ''}`}
              onClick={() => setHobby(item.code)}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          )
        })}
      </div>
      <div className="gap-24" />

      <Button icon="groups" loading={isSubmitting} onClick={submit}>
        {isSubmitting ? '제출 중...' : '팀 번호 생성하기'}
      </Button>
      <div className="gap-20" />
    </Page>
  )
}
