import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon } from './Icon'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'filled' | 'outlined' | 'text'
  icon?: string
  /** true 면 아이콘 자리에 작은 스피너 */
  loading?: boolean
  small?: boolean
  danger?: boolean
  children: ReactNode
}

/** Flutter `FilledButton.icon` / `OutlinedButton.icon` / `TextButton.icon` 대응 */
export function Button({
  variant = 'filled',
  icon,
  loading = false,
  small = false,
  danger = false,
  className,
  disabled,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`]
  if (small) classes.push('btn--sm')
  if (danger) classes.push('btn--danger')
  if (className) classes.push(className)

  return (
    <button type={type} className={classes.join(' ')} disabled={disabled || loading} {...rest}>
      {loading ? (
        <span className="spinner spinner--sm" style={{ width: 18, height: 18, borderTopColor: 'currentColor' }} />
      ) : (
        icon && <Icon name={icon} size={22} />
      )}
      <span>{children}</span>
    </button>
  )
}
