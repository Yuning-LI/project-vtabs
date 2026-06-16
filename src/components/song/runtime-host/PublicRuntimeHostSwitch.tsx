'use client'

import type { PublicSongPageQueryState } from '@/lib/songbook/publicInstruments'
import type {
  PublicRuntimeHostMode,
  PublicRuntimeHostModeSource
} from '@/lib/runtime-core/publicRuntimeHostMode'

type PublicRuntimeHostSwitchProps = {
  songId: string
  activeMode: PublicRuntimeHostMode
  queryState: PublicSongPageQueryState
  pageBasePath?: string
  source: PublicRuntimeHostModeSource
  isVisible: boolean
}

export default function PublicRuntimeHostSwitch({
  songId: _songId,
  activeMode: _activeMode,
  queryState: _queryState,
  pageBasePath: _pageBasePath = '/song',
  source: _source,
  isVisible: _isVisible
}: PublicRuntimeHostSwitchProps) {
  return null
}
