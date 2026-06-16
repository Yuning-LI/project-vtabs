import { useCallback, useRef, useState } from 'react'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'

export type PlaybackUiStatus = 'idle' | 'loading' | 'playing'

export function usePublicRuntimePlaybackState() {
  const [isPlaybackFeatureEnabled, setIsPlaybackFeatureEnabled] = useState(false)
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackUiStatus>('idle')
  const [isPlaybackPanelOpen, setIsPlaybackPanelOpen] = useState(false)
  const [playbackLoadingProgress, setPlaybackLoadingProgress] = useState(0)
  const pendingPlaybackOpenRef = useRef(false)
  const playbackLoadingIntervalRef = useRef<number | null>(null)
  const playbackLoadingStartTimeRef = useRef<number | null>(null)
  const playbackActivationPendingRef = useRef(false)
  const playbackActivationTimeoutRef = useRef<number | null>(null)

  const clearPlaybackLoadingInterval = useCallback(() => {
    const runtimeWindow = getBrowserWindow()
    if (playbackLoadingIntervalRef.current !== null) {
      runtimeWindow?.clearInterval(playbackLoadingIntervalRef.current)
      playbackLoadingIntervalRef.current = null
    }
  }, [])

  const clearPlaybackActivationTimeout = useCallback(() => {
    const runtimeWindow = getBrowserWindow()
    if (playbackActivationTimeoutRef.current !== null) {
      runtimeWindow?.clearTimeout(playbackActivationTimeoutRef.current)
      playbackActivationTimeoutRef.current = null
    }
  }, [])

  const startPlaybackActivationGuard = useCallback(() => {
    const runtimeWindow = getBrowserWindow()
    if (!runtimeWindow) {
      return
    }

    playbackActivationPendingRef.current = true
    clearPlaybackActivationTimeout()
    playbackActivationTimeoutRef.current = runtimeWindow.setTimeout(() => {
      playbackActivationPendingRef.current = false
      playbackActivationTimeoutRef.current = null
    }, 5000)
  }, [clearPlaybackActivationTimeout])

  const resolvePlaybackActivationGuard = useCallback(() => {
    playbackActivationPendingRef.current = false
    clearPlaybackActivationTimeout()
  }, [clearPlaybackActivationTimeout])

  const resetPlaybackLoadingProgress = useCallback(() => {
    clearPlaybackLoadingInterval()
    playbackLoadingStartTimeRef.current = null
    setPlaybackLoadingProgress(0)
  }, [clearPlaybackLoadingInterval])

  const completePlaybackLoadingProgress = useCallback(() => {
    clearPlaybackLoadingInterval()
    playbackLoadingStartTimeRef.current = null
    setPlaybackLoadingProgress(100)
  }, [clearPlaybackLoadingInterval])

  return {
    isPlaybackFeatureEnabled,
    setIsPlaybackFeatureEnabled,
    playbackStatus,
    setPlaybackStatus,
    isPlaybackPanelOpen,
    setIsPlaybackPanelOpen,
    playbackLoadingProgress,
    setPlaybackLoadingProgress,
    pendingPlaybackOpenRef,
    playbackLoadingIntervalRef,
    playbackLoadingStartTimeRef,
    playbackActivationPendingRef,
    clearPlaybackLoadingInterval,
    clearPlaybackActivationTimeout,
    startPlaybackActivationGuard,
    resolvePlaybackActivationGuard,
    resetPlaybackLoadingProgress,
    completePlaybackLoadingProgress
  }
}
