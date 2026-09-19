import { Angry, Frown, Laugh, Meh, Smile, type LucideIcon } from 'lucide-react'

/**
 * 5점 리커트 척도. 흰 알약 모양 트랙 위에 회색 얼굴 5개가 놓이고,
 * 선택한 칸에는 색이 있는 큰 원이 얼굴을 안고 트랙을 따라 미끄러진다.
 * index 0(왼쪽) = 매우 맞음 … index 4(오른쪽) = 매우 아님.
 */
interface FaceOption {
  label: string
  icon: LucideIcon
  /** 선택 원 배경색 */
  color: string
  /** 선택 원 위 얼굴색 */
  ink: string
}

const FACE_OPTIONS: readonly FaceOption[] = [
  { label: '매우 맞음', icon: Laugh, color: '#7d9a5c', ink: '#2f3d22' },
  { label: '맞음', icon: Smile, color: '#e9b63a', ink: '#5a4210' },
  { label: '보통', icon: Meh, color: '#8f7257', ink: '#3a2b1f' },
  { label: '아님', icon: Frown, color: '#ee8434', ink: '#5e2f0c' },
  { label: '매우 아님', icon: Angry, color: '#a48ae0', ink: '#3b2a63' },
] as const

const TRACK_HEIGHT = 52
const KNOB_SIZE = 62

export function FaceScale({
  value,
  onChange,
  name,
}: {
  value: number | undefined
  onChange: (index: number) => void
  name: string
}) {
  const count = FACE_OPTIONS.length
  const selected = value !== undefined ? FACE_OPTIONS[value] : null

  return (
    <div className="px-1 pt-2">
      <div
        role="radiogroup"
        aria-label={name}
        className="relative rounded-full border border-line bg-surface shadow-sm"
        style={{ height: TRACK_HEIGHT }}
      >
        {/* 트랙 위 회색 얼굴 + 구분선 */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
          {FACE_OPTIONS.map((option, index) => {
            const Icon = option.icon
            const isSelected = value === index
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                title={option.label}
                onClick={() => onChange(index)}
                className="relative flex items-center justify-center rounded-full text-faint transition-colors duration-200 hover:text-muted focus-visible:outline-none"
              >
                {index > 0 && <span className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-line" aria-hidden="true" />}
                <Icon
                  size={24}
                  strokeWidth={1.75}
                  className={`transition-all duration-200 ${isSelected ? 'scale-75 opacity-0' : 'opacity-100'}`}
                />
              </button>
            )
          })}
        </div>

        {/* 선택 표시: 색 원이 트랙을 따라 미끄러진다 */}
        {selected && value !== undefined && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 flex items-center justify-center transition-[left] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            style={{
              left: `${(value / count) * 100}%`,
              width: `${100 / count}%`,
              height: KNOB_SIZE,
              marginTop: -KNOB_SIZE / 2,
            }}
          >
            <span
              key={value}
              className="flex items-center justify-center rounded-full shadow-md animate-knob-pop"
              style={{ width: KNOB_SIZE, height: KNOB_SIZE, backgroundColor: selected.color, color: selected.ink }}
            >
              <selected.icon size={30} strokeWidth={2} />
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between px-1 text-[11px] font-medium text-faint">
        <span>{FACE_OPTIONS[0].label}</span>
        <span
          className={`text-[12px] font-semibold transition-all duration-200 ${selected ? 'opacity-100' : 'opacity-0'}`}
          style={{ color: selected?.color }}
        >
          {selected?.label ?? ' '}
        </span>
        <span>{FACE_OPTIONS[count - 1].label}</span>
      </div>
    </div>
  )
}
