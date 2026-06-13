import { useCallback, useRef, useState } from 'react'

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
    if (playbackLoadingIntervalRef.current !== null) {
      window.clearInterval(playbackLoadingIntervalRef.current)
      playbackLoadingIntervalRef.current = null
    }
  }, [])

  const clearPlaybackActivationTimeout = useCallback(() => {
    if (playbackActivationTimeoutRef.current !== null) {
      window.clearTimeout(playbackActivationTimeoutRef.current)
      playbackActivationTimeoutRef.current = null
    }
  }, [])

  const startPlaybackActivationGuard = useCallback(() => {
    playbackActivationPendingRef.current = true
    clearPlaybackActivationTimeout()
    playbackActivationTimeoutRef.current = window.setTimeout(() => {
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
