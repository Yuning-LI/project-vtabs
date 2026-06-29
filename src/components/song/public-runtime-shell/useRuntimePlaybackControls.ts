'use client'

import { useCallback, useEffect } from 'react'
import { sendGaEvent } from '@/lib/analytics/ga'
import {
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import {
  getBrowserDocument,
  getBrowserWindow
} from '@/lib/runtime-core/client/browserEnvironment'
import { dispatchContainerRuntimeCommand } from '../runtime-host/containerRuntimeTransport'
import {
  subscribeToPublicRuntimeHostMessages,
  type PublicRuntimeHostController
} from '../PublicRuntimeHostController'
import type { SongPageFunctionZoneActionControl } from '../SongPageFunctionZone'

type PlaybackUiStatus = 'idle' | 'loading' | 'playing'

type UseRuntimePlaybackControlsInput = {
  songId: string
  activeInstrumentId: string
  noteLabelMode: string
  shouldUseContainerRuntimeHost: boolean
  isPlaybackFeatureEnabled: boolean
  setIsPlaybackFeatureEnabled: (enabled: boolean) => void
  playbackStatus: PlaybackUiStatus
  setPlaybackStatus: (status: PlaybackUiStatus) => void
  isPlaybackPanelOpen: boolean
  setIsPlaybackPanelOpen: (isOpen: boolean) => void
  playbackLoadingProgress: number
  pendingPlaybackOpenRef: React.MutableRefObject<boolean>
  playbackActivationPendingRef: React.MutableRefObject<boolean>
  pendingPlaybackCommandTimeoutRef: React.MutableRefObject<number | null>
  runtimeHostControllerRef: React.MutableRefObject<PublicRuntimeHostController | null>
  resolvePlaybackActivationGuard: () => void
  startPlaybackActivationGuard: () => void
  recordRuntimeHostMonitorEvent: (
    type: 'playback_open',
    details?: Record<string, string | number | boolean | null>
  ) => void
}

export function useRuntimePlaybackControls({
  songId,
  activeInstrumentId,
  noteLabelMode,
  shouldUseContainerRuntimeHost,
  isPlaybackFeatureEnabled,
  setIsPlaybackFeatureEnabled,
  playbackStatus,
  setPlaybackStatus,
  isPlaybackPanelOpen,
  setIsPlaybackPanelOpen,
  playbackLoadingProgress,
  pendingPlaybackOpenRef,
  playbackActivationPendingRef,
  pendingPlaybackCommandTimeoutRef,
  runtimeHostControllerRef,
  resolvePlaybackActivationGuard,
  startPlaybackActivationGuard,
  recordRuntimeHostMonitorEvent
}: UseRuntimePlaybackControlsInput) {
  useEffect(
    () =>
      subscribeToPublicRuntimeHostMessages(songId, data => {
        if (data.type === PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE) {
          if (data.isOpen) {
            resolvePlaybackActivationGuard()
          }
          setIsPlaybackPanelOpen(Boolean(data.isOpen))
          return
        }

        if (data.type !== PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE) {
          return
        }

        if (data.status === 'idle' || data.status === 'loading' || data.status === 'playing') {
          if (
            (pendingPlaybackOpenRef.current || playbackActivationPendingRef.current) &&
            data.status === 'idle'
          ) {
            return
          }
          if (data.status === 'loading' || data.status === 'playing') {
            resolvePlaybackActivationGuard()
          }
          setPlaybackStatus(data.status)
        }
      }),
    [
      pendingPlaybackOpenRef,
      playbackActivationPendingRef,
      resolvePlaybackActivationGuard,
      setIsPlaybackPanelOpen,
      setPlaybackStatus,
      songId
    ]
  )

  const postPlaybackCommandMessage = useCallback(
    (action: 'open' | 'stop' | 'close') => {
      if (!getBrowserWindow()) {
        return false
      }

      const message = {
        type:
          action === 'stop'
            ? PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE
            : action === 'close'
              ? PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE
              : PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
        songId
      }
      const runtimeHost = runtimeHostControllerRef.current
      if (runtimeHost?.dispatchCommand(message)) {
        return true
      }

      if (shouldUseContainerRuntimeHost) {
        return dispatchContainerRuntimeCommand(message)
      }

      return false
    },
    [runtimeHostControllerRef, shouldUseContainerRuntimeHost, songId]
  )

  const handleRuntimeReadyPlaybackCommand = useCallback(() => {
    const runtimeWindow = getBrowserWindow()
    if (
      !runtimeWindow ||
      !pendingPlaybackOpenRef.current ||
      !isPlaybackFeatureEnabled
    ) {
      return
    }

    if (pendingPlaybackCommandTimeoutRef.current !== null) {
      runtimeWindow.clearTimeout(pendingPlaybackCommandTimeoutRef.current)
    }

    pendingPlaybackCommandTimeoutRef.current = runtimeWindow.setTimeout(() => {
      pendingPlaybackCommandTimeoutRef.current = null
      if (postPlaybackCommandMessage('open')) {
        pendingPlaybackOpenRef.current = false
      }
    }, 80)
  }, [
    isPlaybackFeatureEnabled,
    pendingPlaybackCommandTimeoutRef,
    pendingPlaybackOpenRef,
    postPlaybackCommandMessage
  ])

  useEffect(() => {
    const runtimeDocument = getBrowserDocument()
    if (
      !runtimeDocument ||
      (playbackStatus === 'idle' && !isPlaybackPanelOpen && !pendingPlaybackOpenRef.current)
    ) {
      return
    }

    function handleRuntimePlaybackCloseClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      if (!target.closest('.vtabs-public-playback-close')) {
        return
      }

      if (!runtimeHostControllerRef.current?.containsEventTarget(target)) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      postPlaybackCommandMessage('close')
    }

    runtimeDocument.addEventListener('click', handleRuntimePlaybackCloseClick, true)
    return () => {
      runtimeDocument.removeEventListener('click', handleRuntimePlaybackCloseClick, true)
    }
  }, [
    isPlaybackPanelOpen,
    playbackStatus,
    postPlaybackCommandMessage,
    pendingPlaybackOpenRef,
    runtimeHostControllerRef
  ])

  useEffect(() => {
    const runtimeDocument = getBrowserDocument()
    if (!runtimeDocument || !isPlaybackPanelOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (
        target instanceof Element &&
        target.closest('a, button, select, input, textarea, label, summary, [role="button"]')
      ) {
        return
      }

      if (runtimeHostControllerRef.current?.containsEventTarget(target)) {
        return
      }

      postPlaybackCommandMessage('close')
    }

    runtimeDocument.addEventListener('pointerdown', handlePointerDown)
    return () => {
      runtimeDocument.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isPlaybackPanelOpen, postPlaybackCommandMessage, runtimeHostControllerRef])

  const handlePlaybackAction = useCallback(() => {
    if (playbackStatus === 'loading') {
      return
    }

    if (playbackStatus === 'playing') {
      sendGaEvent('song_playback_stop', {
        song_slug: songId,
        instrument_id: activeInstrumentId,
        note_label_mode: noteLabelMode
      })
      if (postPlaybackCommandMessage('stop')) {
        resolvePlaybackActivationGuard()
        setPlaybackStatus('idle')
      }
      return
    }

    pendingPlaybackOpenRef.current = true
    startPlaybackActivationGuard()
    setPlaybackStatus('loading')
    sendGaEvent('song_playback_open', {
      song_slug: songId,
      instrument_id: activeInstrumentId,
      note_label_mode: noteLabelMode
    })
    recordRuntimeHostMonitorEvent('playback_open', {
      instrumentId: activeInstrumentId,
      noteLabelMode
    })

    if (!isPlaybackFeatureEnabled) {
      setIsPlaybackFeatureEnabled(true)
      return
    }

    if (postPlaybackCommandMessage('open')) {
      pendingPlaybackOpenRef.current = false
    }
  }, [
    activeInstrumentId,
    isPlaybackFeatureEnabled,
    noteLabelMode,
    playbackStatus,
    pendingPlaybackOpenRef,
    postPlaybackCommandMessage,
    recordRuntimeHostMonitorEvent,
    resolvePlaybackActivationGuard,
    setIsPlaybackFeatureEnabled,
    setPlaybackStatus,
    songId,
    startPlaybackActivationGuard
  ])

  const playbackLoadingPercent = Math.max(
    0,
    Math.min(100, Math.round(playbackLoadingProgress))
  )

  const actions: SongPageFunctionZoneActionControl[] = [
    {
      id: 'listen',
      label:
        playbackStatus === 'playing'
          ? 'Stop'
          : playbackStatus === 'loading'
            ? `Loading ${playbackLoadingPercent}%`
            : 'Listen',
      ariaLabel:
        playbackStatus === 'playing'
          ? 'Stop audio playback'
          : playbackStatus === 'loading'
            ? `Audio playback is loading, ${playbackLoadingPercent} percent`
            : 'Open audio playback controls',
      icon:
        playbackStatus === 'playing'
          ? 'stop'
          : playbackStatus === 'loading'
            ? 'loading'
            : 'play',
      disabled: playbackStatus === 'loading',
      onClick: handlePlaybackAction
    }
  ]

  return {
    actions,
    handleRuntimeReadyPlaybackCommand
  }
}
