import { createContext, useContext } from 'react'

export type ToastTone = 'info' | 'error' | 'success'

export interface ToastContextValue {
  /** Flutter `Get.snackbar(title, message)` 대응 */
  showToast: (title: string, message?: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
