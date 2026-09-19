import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { Icon } from './Icon'

interface BaseProps {
  label: string
  icon?: string
}

type InputProps = BaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>
type TextareaProps = BaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>

/** Flutter `TextField(decoration: InputDecoration(labelText, hintText, prefixIcon))` 대응 */
export function TextField(props: InputProps | TextareaProps) {
  const { label, icon } = props
  const id = props.id ?? `field-${label}`

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        {icon && <Icon name={icon} size={22} />}
        {props.multiline ? (
          <textarea {...omit(props)} id={id} className="textarea" />
        ) : (
          <input {...omit(props)} id={id} className="input" />
        )}
      </div>
    </div>
  )
}

function omit<T extends BaseProps & { multiline?: boolean }>(props: T) {
  const rest = { ...props } as Partial<T>
  delete rest.label
  delete rest.icon
  delete rest.multiline
  return rest as Omit<T, 'label' | 'icon' | 'multiline'>
}
