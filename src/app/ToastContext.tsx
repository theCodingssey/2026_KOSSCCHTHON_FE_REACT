import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'

import { ToastContext, type ToastTone } from './toast'

interface Toast {
  id: number
  title: string
  message?: string
  tone: ToastTone
}

const TOAST_DURATION_MS = 3_200

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'bg-brand text-white',
  error: 'bg-danger text-white',
  success: 'bg-accent text-white',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const showToast = useCallback((title: string, message?: string, tone: ToastTone = 'info') => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, title, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION_MS)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full max-w-[480px] rounded-2xl px-4 py-3.5 shadow-lg animate-toast-in ${TONE_CLASS[toast.tone]}`}
          >
            <div className="text-[14px] font-semibold tracking-[-0.01em]">{toast.title}</div>
            {toast.message && (
              <div className="mt-0.5 text-[13px] leading-relaxed text-white/80 whitespace-pre-line">{toast.message}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
