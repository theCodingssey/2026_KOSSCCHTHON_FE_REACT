/** Flutter `Icons.*_rounded` 대응. Google Material Symbols(Rounded) 폰트 리거처를 쓴다. */
interface IconProps {
  name: string
  size?: number
  filled?: boolean
  className?: string
}

export function Icon({ name, size = 22, filled = false, className }: IconProps) {
  return (
    <span
      className={`material-symbols-rounded icon${className ? ` ${className}` : ''}`}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500` }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
