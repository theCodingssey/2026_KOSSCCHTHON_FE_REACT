import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  icon?: LucideIcon
  hint?: string
}

type InputProps = BaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>
type TextareaProps = BaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>

const CONTROL_CLASS = [
  'w-full bg-surface text-ink placeholder:text-faint',
  'border border-line rounded-2xl shadow-sm',
  'px-4 font-medium tracking-[-0.01em] outline-none',
  'transition-all duration-200 ease-out',
  'hover:border-line-strong focus:border-brand focus:shadow-md focus:ring-4 focus:ring-brand/[0.08]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ')

/** 라벨 + 입력. 아이콘은 왼쪽에 은은하게. */
export function TextField(props: InputProps | TextareaProps) {
  const { label, icon: Icon, hint } = props
  const id = props.id ?? `field-${label}`
  const withIcon = Icon ? 'pl-12' : ''

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="ml-1 text-[13px] font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 top-[18px] text-faint transition-colors duration-200 peer-focus:text-ink"
          />
        )}
        {props.multiline ? (
          <textarea
            {...omit(props)}
            id={id}
            className={`${CONTROL_CLASS} ${withIcon} min-h-[112px] resize-y py-4 leading-relaxed`}
          />
        ) : (
          <input {...omit(props)} id={id} className={`${CONTROL_CLASS} ${withIcon} h-14`} />
        )}
      </div>
      {hint && <p className="ml-1 text-[12px] text-faint">{hint}</p>}
    </div>
  )
}

function omit<T extends BaseProps & { multiline?: boolean }>(props: T) {
  const rest = { ...props } as Partial<T>
  delete rest.label
  delete rest.icon
  delete rest.hint
  delete rest.multiline
  return rest as Omit<T, 'label' | 'icon' | 'hint' | 'multiline'>
}
