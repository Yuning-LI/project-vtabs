import { useCallback, useRef } from 'react'

export function createRenderLock(timeoutMs = 5000) {
  let timer: ReturnType<typeof setTimeout> | undefined

  const startRender = (onTimeout: () => void) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      onTimeout()
    }, timeoutMs)
  }

  const finishRender = () => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  return { startRender, finishRender }
}

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
