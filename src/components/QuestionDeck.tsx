import { ChevronLeft, ChevronRight, CornerDownRight, MessageCircleHeart, Lightbulb, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { splitSentences } from '../core/text'
import type { QuestionType, TeamQuestionResponse } from '../data/types'
import { Badge } from './Page'

type Direction = 'forward' | 'back'

interface DeckCard {
  key: string
  body: ReactNode
}

/**
 * 범용 카드 덱: 맨 위 카드 한 장 + 뒤에 겹친 카드, 좌우 이동, 진행 링.
 * 카드가 바뀌면 방향에 따라 좌/우에서 넘어오는 애니메이션이 붙는다.
 */
function CardDeck({
  cards,
  index,
  direction,
  onNavigate,
  stackCount,
  counter,
  progress,
  headerRight,
  belowCard,
  minHeight = 232,
}: {
  cards: DeckCard[]
  index: number
  direction: Direction
  onNavigate: (next: number) => void
  stackCount: number
  counter: ReactNode
  progress: number
  headerRight?: ReactNode
  belowCard?: ReactNode
  minHeight?: number
}) {
  const last = Math.max(0, cards.length - 1)
  const card = cards[index]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <ProgressRing value={progress} />
          <span className="text-[14px] font-semibold tabular tracking-[0.02em] text-ink-soft">{counter}</span>
          {headerRight}
        </div>
        <div className="flex items-center gap-1.5">
          <NavButton label="이전" disabled={index <= 0} onClick={() => onNavigate(index - 1)} icon={ChevronLeft} />
          <NavButton label="다음" disabled={index >= last} onClick={() => onNavigate(index + 1)} icon={ChevronRight} />
        </div>
      </div>

      <div className="relative" style={{ minHeight }}>
        {Array.from({ length: stackCount }).map((_, i) => {
          const depth = stackCount - i
          return (
            <div
              key={depth}
              aria-hidden="true"
              className="absolute inset-0 rounded-3xl border border-line bg-surface shadow-sm transition-all duration-300"
              style={{ transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.035})`, opacity: 1 - depth * 0.3 }}
            />
          )
        })}

        {card && (
          <div
            key={card.key}
            className={`relative z-10 flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-md ${
              direction === 'forward' ? 'animate-deck-in-right' : 'animate-deck-in-left'
            }`}
            style={{ minHeight }}
          >
            {card.body}
          </div>
        )}
      </div>

      {belowCard}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 팀 세션: AI 질문 이력
// ---------------------------------------------------------------------------

const TYPE_LABEL: Record<QuestionType, { text: string; tone: 'ok' | 'neutral' | 'warn' }> = {
  INTRO: { text: '자기소개', tone: 'neutral' },
  AI_GENERATED: { text: 'AI 질문', tone: 'ok' },
  FALLBACK: { text: '기본 질문', tone: 'warn' },
}

export interface PendingCard {
  label: string
  description?: string
}

/**
 * 팀 질문 카드 덱. 지금 질문이 맨 위 카드이고, 지나온 질문들이 뒤에 겹쳐 있다.
 * 새 질문이 도착하면 오른쪽에서 카드가 넘어오고, 과거를 보던 사용자는 위치가 유지된다.
 */
export function QuestionDeck({
  questions,
  pending,
  questionCount,
  questionLimit,
  headerRight,
  footer,
}: {
  /** orderNo 오름차순 질문 이력 */
  questions: TeamQuestionResponse[]
  /** 다음 질문을 만드는 중이면 맨 위에 임시 카드를 얹는다 */
  pending: PendingCard | null
  questionCount: number
  questionLimit: number
  headerRight?: ReactNode
  footer?: ReactNode
}) {
  const total = questions.length + (pending ? 1 : 0)
  const last = Math.max(0, total - 1)

  /** null = 최신 카드를 따라간다. 숫자 = 사용자가 고정한 위치 */
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)
  const [navDirection, setNavDirection] = useState<Direction>('forward')

  const index = pinnedIndex === null ? last : Math.min(pinnedIndex, last)
  const direction = pinnedIndex === null ? 'forward' : navDirection
  const isLatest = index === last

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(last, next))
    setNavDirection(clamped >= index ? 'forward' : 'back')
    setPinnedIndex(clamped === last ? null : clamped)
  }

  const cards: DeckCard[] = [
    ...questions.map((q, i) => ({
      key: `q-${q.questionId}`,
      body: <QuestionBody q={q} isLatest={i === last} />,
    })),
    ...(pending ? [{ key: 'pending', body: <PendingBody pending={pending} /> }] : []),
  ]

  const current = questions[index]
  const counterNo = current ? current.orderNo : Math.min(questionCount + 1, questionLimit)

  return (
    <CardDeck
      cards={cards}
      index={index}
      direction={direction}
      onNavigate={go}
      stackCount={Math.min(2, index)}
      counter={
        <>
          {counterNo} <span className="text-faint">/ {questionLimit}</span>
        </>
      }
      progress={questionLimit > 0 ? questionCount / questionLimit : 0}
      headerRight={headerRight}
      belowCard={
        <>
          {!isLatest && (
            <button
              type="button"
              onClick={() => go(last)}
              className="inline-flex items-center justify-center gap-1.5 self-center rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted transition-all duration-200 hover:bg-ink/[0.05] hover:text-ink"
            >
              <CornerDownRight size={13} /> 지금 질문으로 돌아가기
            </button>
          )}
          {footer}
        </>
      }
    />
  )
}

function QuestionBody({ q, isLatest }: { q: TeamQuestionResponse; isLatest: boolean }) {
  const type = TYPE_LABEL[q.type]
  const keywords = q.answer?.keywords ?? []
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-faint tabular">Q{q.orderNo}</span>
        <Badge tone={type.tone}>{type.text}</Badge>
        {q.status === 'PROCESSING' && <Badge tone="info">답변 정리 중</Badge>}
        {q.status === 'FAILED' && <Badge tone="danger">생성 실패</Badge>}
        {q.status === 'SKIPPED' && <Badge tone="neutral">건너뜀</Badge>}
        {q.status === 'DONE' && !isLatest && <Badge tone="neutral">완료</Badge>}
      </div>

      <QuestionText text={q.content} />

      {(keywords.length > 0 || q.answer) && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-6">
          {keywords.length > 0 ? (
            keywords.map((k) => (
              <span key={k} className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent">
                {k}
              </span>
            ))
          ) : (
            <span className="text-[12px] text-faint">답변을 보냈어요</span>
          )}
        </div>
      )}
    </>
  )
}

function PendingBody({ pending }: { pending: PendingCard }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Lightbulb size={24} className="animate-pulse" />
      </span>
      <p className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-ink">{pending.label}</p>
      {pending.description && <p className="mt-1.5 text-[14px] text-muted break-keep">{pending.description}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 종료 후: 주최자의 마무리 질문
// ---------------------------------------------------------------------------

/**
 * 주최자가 등록한 마무리 질문 덱. 첫 장부터 시작해 오른쪽으로 넘기며 팀이 함께 이야기한다.
 * 뒤에는 남은 질문 수만큼(최대 2장) 카드가 겹쳐 보인다.
 */
export function FinalQuestionDeck({ questions, headerRight }: { questions: string[]; headerRight?: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<Direction>('forward')
  const total = questions.length
  const last = Math.max(0, total - 1)

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(last, next))
    setDirection(clamped >= index ? 'forward' : 'back')
    setIndex(clamped)
  }

  const cards: DeckCard[] = questions.map((q, i) => ({
    key: `final-${i}`,
    body: (
      <>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-faint tabular">{String(i + 1).padStart(2, '0')}</span>
          <Badge tone="ok">
            <MessageCircleHeart size={11} /> 주최자 질문
          </Badge>
        </div>
        <QuestionText text={q} />
        <p className="mt-auto pt-6 text-[12px] text-faint">화면을 내려놓고 팀원들과 자유롭게 이야기해 보세요.</p>
      </>
    ),
  }))

  return (
    <CardDeck
      cards={cards}
      index={index}
      direction={direction}
      onNavigate={go}
      stackCount={Math.min(2, last - index)}
      counter={
        <>
          {index + 1} <span className="text-faint">/ {total}</span>
        </>
      }
      progress={total > 0 ? (index + 1) / total : 0}
      headerRight={headerRight}
    />
  )
}

// ---------------------------------------------------------------------------
// 공용 조각
// ---------------------------------------------------------------------------

/** AI·주최자 문장을 문장 단위로 줄바꿈해 크게 보여 준다 */
function QuestionText({ text }: { text: string }) {
  return (
    <p className="mt-5 text-[22px] font-semibold leading-[1.45] tracking-[-0.02em] text-ink break-keep text-pretty">
      {splitSentences(text).map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </p>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  icon: Icon,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  icon: LucideIcon
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm transition-all duration-200 hover:border-line-strong hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon size={18} />
    </button>
  )
}

function ProgressRing({ value }: { value: number }) {
  const size = 22
  const stroke = 2.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-line" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        className="text-brand transition-[stroke-dashoffset] duration-500 ease-out"
      />
    </svg>
  )
}
