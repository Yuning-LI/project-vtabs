import { useEffect, useState } from 'react'

export function useFontReady(timeoutMs = 3000): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    document.fonts.ready.then(() => setReady(true))
    timeout = setTimeout(() => setReady(true), timeoutMs)
    return () => clearTimeout(timeout)
  }, [timeoutMs])

  return ready
}
