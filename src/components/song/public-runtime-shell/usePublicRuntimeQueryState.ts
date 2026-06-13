import { useEffect, useState } from 'react'
import type { PublicSongPageQueryState } from '@/lib/songbook/publicInstruments'

export function usePublicRuntimeQueryState(queryState: PublicSongPageQueryState) {
  const [currentQueryState, setCurrentQueryState] = useState(queryState)

  useEffect(() => {
    setCurrentQueryState(queryState)
  }, [queryState])

  return currentQueryState
}
