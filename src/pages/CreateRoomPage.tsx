import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '../app/session'
import { useToast } from '../app/toast'
import { routes } from '../app/routes'
import { Button } from '../components/Button'
import { Card, InkCard, Page } from '../components/Page'
import { TextField } from '../components/TextField'
import { Icon } from '../components/Icon'
import { describeError } from '../data/apiClient'
import { iceLinkApi } from '../data/iceLinkApi'

const TIP_TEXT = '아이스 브레이킹 질문은\nIceLink가 직접 생성합니다!\n추가하고 싶은 질문이 있다면\n작성해주세요!'
const MAX_FINAL_QUESTIONS = 5

/** Flutter `CreateRoomPage` + `CreateRoomController` */
export function CreateRoomPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { refresh } = useSession()

  const [teamSizeText, setTeamSizeText] = useState('')
  const [questionDraft, setQuestionDraft] = useState('')
  const [customQuestions, setCustomQuestions] = useState<string[]>([])
  const [roomPin, setRoomPin] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const addCustomQuestion = () => {
    const question = questionDraft.trim()
    if (!question) {
      showToast('질문을 입력해주세요', '추가할 질문 내용을 먼저 작성해주세요.')
      return
    }
    if (customQuestions.length >= MAX_FINAL_QUESTIONS) {
      showToast('질문은 최대 5개', '마무리 질문은 5개까지 등록할 수 있습니다.')
      return
    }
    setCustomQuestions((prev) => [...prev, question])
    setQuestionDraft('')
    showToast('추가되었습니다!', '주최자 질문이 목록에 추가되었습니다.', 'success')
  }

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const createRoomPin = async () => {
    const count = Number.parseInt(teamSizeText.trim(), 10)
    if (Number.isNaN(count) || count < 2 || count > 10) {
      showToast('팀별 인원 확인', '팀별 인원은 2~10 사이 숫자로 입력해주세요.')
      return
    }

    setIsCreating(true)
    try {
      const room = await iceLinkApi.createRoom({
        title: 'ICELINK 아이스브레이킹',
        situation: '처음 만난 참가자들이 자연스럽게 대화할 수 있는 아이스브레이킹 자리',
        teamSize: count,
        finalQuestions: customQuestions.slice(0, MAX_FINAL_QUESTIONS),
      })
      setRoomPin(room.code)
      void refresh().catch(() => undefined)
    } catch (error) {
      showToast('방 생성 실패', describeError(error, '서버에 방 생성 요청을 보내지 못했습니다.'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Page title="팀 구성 및 질문 추가">
      <h2 className="title">팀별 인원</h2>
      <div className="gap-12" />
      <TextField
        label="팀별 인원"
        icon="groups"
        placeholder="예: 6명 (숫자만 작성하세요)"
        inputMode="numeric"
        value={teamSizeText}
        disabled={roomPin !== null}
        onChange={(e) => setTeamSizeText(e.target.value.replace(/\D/g, ''))}
      />
      <div className="gap-24" />

      <InkCard className="card--pad-20" >
        <span className="eyebrow">Tip!</span>
        <div className="gap-10" />
        <p style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.22, whiteSpace: 'pre-line' }}>{TIP_TEXT}</p>
      </InkCard>
      <div className="gap-22" />

      <TextField
        multiline
        label="주최자 추가 질문"
        icon="question_answer"
        placeholder="예: 해커톤에서 어떤 부분이 가장 자신있나요?"
        rows={3}
        maxLength={200}
        value={questionDraft}
        disabled={roomPin !== null}
        onChange={(e) => setQuestionDraft(e.target.value)}
      />
      <div className="gap-12" />
      <Button variant="outlined" icon="add" onClick={addCustomQuestion} disabled={roomPin !== null}>
        질문 추가하기
      </Button>

      {customQuestions.length > 0 && (
        <>
          <div className="gap-18" />
          <Card className="card--pad-16">
            <h3 className="title" style={{ fontSize: 18 }}>
              추가된 질문
            </h3>
            <div className="gap-12" />
            <div className="list">
              {customQuestions.map((question, index) => (
                <div key={`${index}-${question}`} className="tile">
                  <span className="tile__index">{index + 1}</span>
                  <span className="tile__text" style={{ paddingTop: 6 }}>
                    {question}
                  </span>
                  {roomPin === null && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => removeCustomQuestion(index)}
                      aria-label="질문 삭제"
                      title="질문 삭제"
                    >
                      <Icon name="close" size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="gap-24" />
      {roomPin === null ? (
        <Button icon="pin" loading={isCreating} onClick={createRoomPin}>
          방 핀 생성하기
        </Button>
      ) : (
        <Card className="card--center card--pad-20" style={{ borderRadius: 24 }}>
          <span className="caption" style={{ fontSize: 14 }}>
            참가용 핀
          </span>
          <div className="gap-8" />
          <span className="pin-text">{roomPin}</span>
          <div className="gap-18" />
          <Button icon="arrow_forward" onClick={() => navigate(routes.peopleChecklist(roomPin))}>
            참가자 명단 확인하기
          </Button>
        </Card>
      )}
    </Page>
  )
}
