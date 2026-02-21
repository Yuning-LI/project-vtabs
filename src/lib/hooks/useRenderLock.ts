import { useCallback, useRef } from 'react'

export function useRenderLock(timeoutMs = 5000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const startRender = useCallback(
    (onTimeout: () => void) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onTimeout()
      }, timeoutMs)
    },
    [timeoutMs]
  )

  const finishRender = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  return { startRender, finishRender }
}
