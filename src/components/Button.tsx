import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  /** true 면 아이콘 자리에 스피너, 클릭 비활성 */
  loading?: boolean
  /** 부모 폭에 맞출지 (기본 true — 모바일 CTA) */
  block?: boolean
  children: ReactNode
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-strong hover:shadow-md',
  secondary: 'bg-surface text-ink border border-line shadow-sm hover:border-line-strong hover:shadow-md',
  ghost: 'bg-transparent text-muted hover:text-ink hover:bg-ink/[0.05]',
  danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white shadow-sm hover:shadow-md',
}

const SIZE_CLASS: Record<Size, string> = {
  md: 'h-14 px-5 text-[15px] gap-2 rounded-2xl',
  sm: 'h-11 px-4 text-[14px] gap-1.5 rounded-xl',
}

/** 모든 CTA. 둥근 모서리 + 은은한 그림자 + 부드러운 호버 전환. */
export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  block = true,
  className = '',
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'md' ? 18 : 16
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center font-medium tracking-[-0.01em] select-none',
        'transition-all duration-200 ease-out active:scale-[0.985]',
        'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <LoaderCircle size={iconSize} className="animate-spin" strokeWidth={2.25} />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={2} />
      )}
      <span>{children}</span>
    </button>
  )
}
