import { useEffect, useRef } from 'react'

/**
 * Flutter 컨트롤러의 `Timer.periodic` + 재진입 방지 플래그(`_isLoading...`) 대응.
 * `task` 가 진행 중이면 다음 틱을 건너뛰고, 언마운트 시 타이머를 정리한다.
 */
export function usePolling(task: () => Promise<void>, intervalMs: number, enabled = true): void {
  const taskRef = useRef(task)
  useEffect(() => {
    taskRef.current = task
  }, [task])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    let running = false

    const tick = async () => {
      if (running || cancelled) {
        return
      }
      running = true
      try {
        await taskRef.current()
      } catch {
        // 폴링 실패는 조용히 넘기고 다음 주기에 다시 시도한다.
      } finally {
        running = false
      }
    }

    void tick()
    const timer = window.setInterval(() => void tick(), intervalMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [intervalMs, enabled])
}
