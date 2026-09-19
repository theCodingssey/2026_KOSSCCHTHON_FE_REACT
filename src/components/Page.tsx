import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { Icon } from './Icon'

/** Flutter `IceLinkAppBar` 대응. 제목 가운데, 투명 배경. 뒤로가기는 브라우저 히스토리를 쓴다. */
export function AppBar({ title, showBack = true }: { title: string; showBack?: boolean }) {
  const navigate = useNavigate()
  return (
    <header className="appbar">
      {showBack ? (
        <button type="button" className="appbar__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <Icon name="arrow_back" size={24} />
        </button>
      ) : (
        <span className="appbar__back" />
      )}
      <h1 className="appbar__title">{title}</h1>
      <span className="appbar__back" />
    </header>
  )
}

/**
 * `Scaffold + SafeArea + Center + ConstrainedBox(maxWidth)` 조합 대응.
 * `footer` 는 스크롤 영역 밖 하단 고정 버튼(참가자 명단 화면 패턴).
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
  /** 본문을 세로 중앙에 배치 (Spacer 로 위아래 여백을 준 화면들) */
  centered?: boolean
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page">
      {title && <AppBar title={title} showBack={showBack} />}
      <main className={`page__body${centered ? ' page__body--centered' : ''}`}>
        <div className="page__content" style={{ maxWidth }}>
          {children}
        </div>
      </main>
      {footer && (
        <div className="page__footer">
          <div className="page__content" style={{ maxWidth }}>
            {footer}
          </div>
        </div>
      )}
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/** 어두운(ink) 강조 카드. 대기/팀 번호/질문 화면에서 반복되는 패턴 */
export function InkCard({ children, className, style }: CardProps) {
  return (
    <section className={`card card--ink${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </section>
  )
}

/** 흰 배경 + 테두리 카드 */
export function Card({ children, className, style }: CardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </section>
  )
}

export function Spinner({ size = 42, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      className={`spinner${light ? ' spinner--light' : ''}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="로딩 중"
    />
  )
}
