import { ChevronLeft, LoaderCircle } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/** 상단 바: 가운데 제목, 왼쪽 뒤로가기. 배경은 페이지와 같은 미색. */
export function AppBar({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 grid h-14 grid-cols-[48px_1fr_48px] items-center bg-paper/85 px-1 backdrop-blur-md">
      {showBack ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-all duration-200 hover:bg-ink/[0.05] hover:text-ink active:scale-95"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
      ) : (
        <span />
      )}
      <h1 className="truncate text-center text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      <span />
    </header>
  )
}

/**
 * 화면 골격. 본문은 최대 폭 안에서 세로로 흐르고, footer 는 하단 고정 CTA.
 */
export function Page({
  title,
  showBack,
  maxWidth = 520,
  centered = false,
  footer,
  children,
}: {
  title?: string
  showBack?: boolean
  maxWidth?: 480 | 520
  /** 본문을 세로 중앙에 배치 */
  centered?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {title && <AppBar title={title} showBack={showBack} />}
      <main className={`flex flex-1 justify-center px-5 pb-8 pt-3 ${centered ? 'items-center' : ''}`}>
        <div className="flex w-full flex-col animate-fade-up" style={{ maxWidth }}>
          {children}
        </div>
      </main>
      {footer && (
        <div className="sticky bottom-0 flex justify-center bg-gradient-to-t from-paper via-paper/95 to-paper/0 px-5 pt-6 safe-bottom">
          <div className="w-full" style={{ maxWidth }}>
            {footer}
          </div>
        </div>
      )}
    </div>
  )
}

/** 화면 도입부: 작은 오버라인 + 큰 제목 + 설명 (참고 앱의 섹션 헤더 패턴) */
export function Intro({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
}) {
  const center = align === 'center'
  return (
    <div className={`flex flex-col gap-3 ${center ? 'items-center text-center' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="display">{title}</h1>
      {description && <p className="max-w-[38ch] text-[15px] leading-relaxed text-muted whitespace-pre-line">{description}</p>}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** 호버 시 살짝 떠오르는 효과 (클릭 가능한 카드) */
  interactive?: boolean
}

/** 흰 카드. rounded-2xl + shadow-sm, 호버 시 shadow-md */
export function Card({ children, className = '', style, interactive = false }: CardProps) {
  return (
    <section
      style={style}
      className={[
        'flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-sm',
        'transition-all duration-200 ease-out hover:shadow-md',
        interactive ? 'cursor-pointer hover:-translate-y-px hover:border-line-strong' : '',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

/** 잉크색 강조 카드. 질문·대기 화면의 주인공 영역 */
export function InkCard({ children, className = '', style }: CardProps) {
  return (
    <section
      style={style}
      className={[
        'flex flex-col rounded-3xl bg-brand p-7 text-white shadow-md',
        'transition-all duration-200 ease-out hover:shadow-lg',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  )
}

type BadgeTone = 'neutral' | 'ok' | 'warn' | 'info' | 'danger' | 'onDark'

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-ink/[0.05] text-muted',
  ok: 'bg-accent-soft text-accent',
  warn: 'bg-warn-soft text-warn',
  info: 'bg-brand text-white',
  danger: 'bg-danger-soft text-danger',
  onDark: 'bg-white/10 text-white/90',
}

export function Badge({
  tone = 'neutral',
  children,
  title,
  className = '',
}: {
  tone?: BadgeTone
  children: ReactNode
  title?: string
  className?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em] transition-colors duration-200 ${BADGE_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** 참고 앱의 헤어라인 리스트 행: 왼쪽 라벨, 오른츽 메타 */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  className = '',
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3 py-3.5 first:pt-1 last:pb-1 ${className}`}>
      {leading && <div className="flex-none">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[12px] text-muted">{subtitle}</div>}
      </div>
      {trailing && <div className="flex-none">{trailing}</div>}
    </div>
  )
}

/** 리스트 행 왼쪽의 작은 번호 배지 */
export function IndexDot({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'ink' }) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-semibold tabular ${
        tone === 'ink' ? 'bg-brand text-white' : 'bg-ink/[0.05] text-ink-soft'
      }`}
    >
      {children}
    </span>
  )
}

export function Spinner({ size = 28, light = false, className = '' }: { size?: number; light?: boolean; className?: string }) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2}
      role="progressbar"
      aria-label="로딩 중"
      className={`animate-spin ${light ? 'text-white/80' : 'text-muted'} ${className}`}
    />
  )
}

/** 세션 복원 중 전체 화면 로딩 */
export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Spinner size={28} />
    </div>
  )
}

/** 세로 여백 (Flutter SizedBox 대응) */
export function Gap({ size }: { size: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16 | 20 }) {
  return <div style={{ height: size * 4 }} aria-hidden="true" />
}
