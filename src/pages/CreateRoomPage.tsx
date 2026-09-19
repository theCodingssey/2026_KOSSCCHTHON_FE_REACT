import { ArrowRight, KeyRound, MessageSquareText, Plus, Lightbulb, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Card, Gap, IndexDot, InkCard, Intro, ListRow, Page } from '../components/Page'
import { TextField } from '../components/TextField'
import { describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'

const MAX_FINAL_QUESTIONS = 5

/** 주최자: 팀 인원 + 마무리 질문 → 방 생성 → 핀 발급 */
export function CreateRoomPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { refresh } = useSession()

  const [teamSizeText, setTeamSizeText] = useState('')
  const [questionDraft, setQuestionDraft] = useState('')
  const [customQuestions, setCustomQuestions] = useState<string[]>([])
  const [roomPin, setRoomPin] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const locked = roomPin !== null

  const addCustomQuestion = () => {
    const question = questionDraft.trim()
    if (!question) {
      showToast('질문을 입력해 주세요', '추가할 질문 내용을 먼저 작성해 주세요.')
      return
    }
    if (customQuestions.length >= MAX_FINAL_QUESTIONS) {
      showToast('질문은 최대 5개', '마무리 질문은 5개까지 등록할 수 있어요.')
      return
    }
    setCustomQuestions((prev) => [...prev, question])
    setQuestionDraft('')
  }

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const createRoomPin = async () => {
    const count = Number.parseInt(teamSizeText.trim(), 10)
    if (Number.isNaN(count) || count < 2 || count > 10) {
      showToast('팀별 인원 확인', '팀별 인원은 2~10 사이 숫자로 입력해 주세요.')
      return
    }

    setIsCreating(true)
    try {
      const room = await iceLinkApi.createRoom({
        title: 'IceLink 아이스브레이킹',
        situation: '처음 만난 참가자들이 자연스럽게 대화할 수 있는 아이스브레이킹 자리',
        teamSize: count,
        finalQuestions: customQuestions.slice(0, MAX_FINAL_QUESTIONS),
      })
      setRoomPin(room.code)
      void refresh().catch(() => undefined)
    } catch (error) {
      showToast('방을 만들지 못했어요', describeError(error, '서버에 방 생성 요청을 보내지 못했습니다.'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Page title="방 만들기">
      <Intro
        eyebrow="01 · 주최자"
        title={'팀을 구성하고\n질문을 준비하세요'}
        description="아이스 브레이킹 질문은 IceLink가 직접 만들어요. 마지막에 함께 나눌 질문이 있다면 추가해 주세요."
      />
      <Gap size={8} />

      <TextField
        label="팀별 인원"
        icon={Users}
        placeholder="2 ~ 10 (숫자만)"
        inputMode="numeric"
        value={teamSizeText}
        disabled={locked}
        onChange={(e) => setTeamSizeText(e.target.value.replace(/\D/g, ''))}
      />
      <Gap size={6} />

      <InkCard className="gap-3" style={{ padding: 22 }}>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.1em] text-white/60">
          <Lightbulb size={14} /> TIP
        </span>
        <p className="text-[17px] font-semibold leading-snug tracking-[-0.02em]">
          질문은 IceLink가 생성해요.
          <br />
          <span className="text-white/70">마무리에 나눌 질문만 더해 주세요.</span>
        </p>
      </InkCard>
      <Gap size={6} />

      <TextField
        multiline
        label="주최자 마무리 질문"
        icon={MessageSquareText}
        placeholder="예: 해커톤에서 어떤 부분이 가장 자신 있나요?"
        rows={3}
        maxLength={200}
        value={questionDraft}
        disabled={locked}
        onChange={(e) => setQuestionDraft(e.target.value)}
      />
      <Gap size={3} />
      <Button variant="secondary" icon={Plus} onClick={addCustomQuestion} disabled={locked}>
        질문 추가하기
      </Button>

      {customQuestions.length > 0 && (
        <>
          <Gap size={5} />
          <Card style={{ paddingTop: 16, paddingBottom: 12 }}>
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">추가된 질문</h2>
              <span className="text-[12px] text-muted tabular">
                {customQuestions.length} / {MAX_FINAL_QUESTIONS}
              </span>
            </div>
            <Gap size={2} />
            <div className="hairline">
              {customQuestions.map((question, index) => (
                <ListRow
                  key={`${index}-${question}`}
                  leading={<IndexDot>{index + 1}</IndexDot>}
                  title={<span className="whitespace-normal leading-snug">{question}</span>}
                  trailing={
                    !locked && (
                      <button
                        type="button"
                        onClick={() => removeCustomQuestion(index)}
                        aria-label="질문 삭제"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-faint transition-all duration-200 hover:bg-ink/[0.05] hover:text-ink"
                      >
                        <X size={16} />
                      </button>
                    )
                  }
                />
              ))}
            </div>
          </Card>
        </>
      )}

      <Gap size={8} />
      {roomPin === null ? (
        <Button icon={KeyRound} loading={isCreating} onClick={createRoomPin}>
          방 핀 생성하기
        </Button>
      ) : (
        <Card className="items-center text-center" style={{ padding: 24 }}>
          <span className="eyebrow">참가용 핀</span>
          <div className="mt-3 text-[44px] font-semibold leading-none tracking-[0.06em] tabular">{roomPin}</div>
          <p className="mt-3 text-[13px] text-muted">참가자에게 이 핀을 알려 주세요.</p>
          <Gap size={5} />
          <Button icon={ArrowRight} onClick={() => navigate(routes.peopleChecklist(roomPin))}>
            참가자 명단 확인하기
          </Button>
        </Card>
      )}
    </Page>
  )
}
