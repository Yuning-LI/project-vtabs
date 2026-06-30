'use client'

import { useCallback, useEffect } from 'react'
import { PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { dispatchContainerRuntimeCommand } from '../runtime-host/containerRuntimeTransport'
import type { PublicRuntimeHostController } from '../PublicRuntimeHostController'

type UseRuntimeDisplaySettingCommandsInput = {
  songId: string
  measureLayout: string | null | undefined
  sheetScale: string | number | null | undefined
  showGraph: string | null | undefined
  showLyric: string | null | undefined
  showMeasureNum: string | null | undefined
  enabled: boolean
  runtimeHostControllerRef: React.MutableRefObject<PublicRuntimeHostController | null>
}

export function useRuntimeDisplaySettingCommands({
  songId,
  measureLayout,
  sheetScale,
  showGraph,
  showLyric,
  showMeasureNum,
  enabled,
  runtimeHostControllerRef
}: UseRuntimeDisplaySettingCommandsInput) {
  const applyRuntimeDisplaySettings = useCallback(() => {
    if (!enabled) {
      return false
    }

    const message = {
      type: PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE,
      songId,
      settings: {
        measureLayout: measureLayout ?? null,
        sheetScale: sheetScale ?? null,
        showGraph: showGraph ?? null,
        showLyric: showLyric ?? null,
        showMeasureNum: showMeasureNum ?? null
      }
    }

    return (
      runtimeHostControllerRef.current?.dispatchCommand(message) ??
      dispatchContainerRuntimeCommand(message)
    )
  }, [
    enabled,
    measureLayout,
    runtimeHostControllerRef,
    sheetScale,
    showGraph,
    showLyric,
    showMeasureNum,
    songId
  ])

  useEffect(() => {
    applyRuntimeDisplaySettings()
  }, [applyRuntimeDisplaySettings])

  return { applyRuntimeDisplaySettings }
}
