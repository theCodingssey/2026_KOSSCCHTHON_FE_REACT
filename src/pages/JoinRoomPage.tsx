import { Film, Gamepad2, KeyRound, Plane, Trophy, Users, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { FaceScale } from '../components/FaceScale'
import { Card, Gap, Intro, Page } from '../components/Page'
import { TextField } from '../components/TextField'
import { ApiError, describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'
import type { InterestCategory } from '../data/types'

/** 성격 6문항 (프론트 하드코딩) */
const QUESTIONS = [
  '나는 함께 있는 것을 좋아한다.',
  '나는 새로운 사람들과 만나는 것이 편하다.',
  '나는 파티나 모임에서 주도적으로 대화를 이끈다.',
  '나는 사람들과 함께 있을 때 에너지를 얻는다.',
  '나는 많은 사람들과 친구로 지내는 것을 선호한다.',
  '나는 생각하기 전에 먼저 말하는 편이다.',
] as const

/** 왼쪽(index 0) = 매우 맞음 = 5점 … 오른쪽(index 4) = 매우 아님 = 1점. 선택지는 FaceScale 이 그린다. */

const HOBBIES: { label: string; code: InterestCategory; icon: LucideIcon }[] = [
  { label: '게임', code: 'GAME', icon: Gamepad2 },
  { label: '여행', code: 'TRAVEL', icon: Plane },
  { label: '음식', code: 'FOOD', icon: UtensilsCrossed },
  { label: '스포츠', code: 'SPORTS', icon: Trophy },
  { label: '영화', code: 'MOVIE', icon: Film },
]

/** 참가자: 핀 + 성격 설문 + 관심사 → 참가 + 설문 제출 */
export function JoinRoomPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { refresh } = useSession()

  const [pin, setPin] = useState('')
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [hobby, setHobby] = useState<InterestCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const answered = Object.keys(answers).length
  const isSurveyComplete = pin.trim().length > 0 && answered === QUESTIONS.length && hobby !== null

  const submit = async () => {
    if (!isSurveyComplete || hobby === null) {
      showToast('아직 덜 골랐어요', '핀, 6개 설문, 관심사를 모두 선택해 주세요.')
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
          ? `이미 다른 방(${String(error.problem?.activeRoomCode ?? '')})에 참가 중입니다. 진행 중인 방으로 이동하거나 방이 끝난 뒤 다시 시도해주세요.`
          : describeError(error, '방 코드와 서버 상태를 확인해 주세요.')
      showToast('참가하지 못했어요', hint, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page
      title="방 참가하기"
      footer={
        <Button icon={Users} loading={isSubmitting} onClick={submit} disabled={!isSurveyComplete}>
          {isSubmitting ? '제출 중…' : '팀 번호 받기'}
        </Button>
      }
    >
      <Intro
        eyebrow="01 · 참가"
        title={'방 핀을 입력하고\n설문에 답해 주세요'}
        description="성격 질문 6개에 답하고 관심사를 하나 고르면 비슷한 사람들과 팀이 돼요."
      />
      <Gap size={8} />

      <TextField
        label="방 핀"
        icon={KeyRound}
        placeholder="예: K7M3PQ"
        value={pin}
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        className="uppercase"
        style={{ letterSpacing: '0.12em' }}
        onChange={(e) => setPin(e.target.value.toUpperCase())}
      />
      <Gap size={10} />

      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">성격 설문</h2>
        <span className="text-[13px] text-muted tabular">
          {answered} / {QUESTIONS.length}
        </span>
      </div>
      <Gap size={3} />

      <div className="flex flex-col gap-3">
        {QUESTIONS.map((question, qIndex) => {
          const done = answers[qIndex] !== undefined
          return (
            <Card key={question} className={`gap-3 ${done ? 'border-line-strong' : ''}`} style={{ padding: 18 }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-[12px] font-semibold text-faint tabular">{String(qIndex + 1).padStart(2, '0')}</span>
                <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] break-keep">{question}</h3>
              </div>
              <FaceScale
                name={question}
                value={answers[qIndex]}
                onChange={(aIndex) => setAnswers((prev) => ({ ...prev, [qIndex]: aIndex }))}
              />
            </Card>
          )
        })}
      </div>

      <Gap size={10} />
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">관심사</h2>
        <span className="text-[13px] text-muted">하나만 선택</span>
      </div>
      <Gap size={3} />
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="관심사 선택">
        {HOBBIES.map(({ label, code, icon: Icon }) => {
          const selected = hobby === code
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setHobby(code)}
              className={[
                'inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-[14px] font-medium',
                'transition-all duration-200 ease-out active:scale-[0.97]',
                selected
                  ? 'border-brand bg-brand text-white shadow-md'
                  : 'border-line bg-surface text-ink-soft shadow-sm hover:border-line-strong hover:shadow-md',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={2} className={selected ? 'text-white' : 'text-accent'} />
              {label}
            </button>
          )
        })}
      </div>
      <Gap size={8} />
    </Page>
  )
}
