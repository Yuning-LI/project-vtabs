import { useEffect, useState } from 'react'

/**
 * 等待字体加载完成后再允许渲染
 *
 * @param timeoutMs - 最大等待时间，超时后也视为就绪
 * @returns 字体是否就绪
 */
export function useFontReady(timeoutMs = 3000): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    document.fonts.ready.then(() => setReady(true)) // 字体全部加载完成
    timeout = setTimeout(() => setReady(true), timeoutMs) // 超时兜底，避免阻塞
    return () => clearTimeout(timeout)
  }, [timeoutMs])

  return ready
}
