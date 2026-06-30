'use client'

import { useCallback, useEffect } from 'react'
import { PUBLIC_RUNTIME_DISPLAY_SETTING_MESSAGE } from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { dispatchContainerRuntimeCommand } from '../runtime-host/containerRuntimeTransport'
import type { PublicRuntimeHostController } from '../PublicRuntimeHostController'

type UseRuntimeDisplaySettingCommandsInput = {
  songId: string
  instrument: string | null | undefined
  fingering: string | null | undefined
  fingeringIndex: string | number | null | undefined
  letterTrackScale:
    | Array<{
        accidental: number
        letter: string
        octave: number
      }>
    | null
    | undefined
  measureLayout: string | null | undefined
  noteLabelMode: string | null | undefined
  sheetScale: string | number | null | undefined
  showGraph: string | null | undefined
  showLyric: string | null | undefined
  showMeasureNum: string | null | undefined
  enabled: boolean
  runtimeHostControllerRef: React.MutableRefObject<PublicRuntimeHostController | null>
}

export function useRuntimeDisplaySettingCommands({
  songId,
  instrument,
  fingering,
  fingeringIndex,
  letterTrackScale,
  measureLayout,
  noteLabelMode,
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
        instrument: instrument ?? null,
        fingering: fingering ?? null,
        fingeringIndex: fingeringIndex ?? null,
        letterTrackScale: letterTrackScale ?? null,
        measureLayout: measureLayout ?? null,
        noteLabelMode: noteLabelMode ?? null,
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
    fingering,
    fingeringIndex,
    instrument,
    letterTrackScale,
    measureLayout,
    noteLabelMode,
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
