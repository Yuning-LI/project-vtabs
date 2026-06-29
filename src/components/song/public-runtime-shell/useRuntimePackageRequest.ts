'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRuntimeHtmlContainerPackage } from '@/lib/runtime-core/client/runtimeHtmlPackage'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'
import { buildPublicRuntimeUrl } from '@/lib/runtime-core/publicRuntimePaths'
import type { RuntimeScriptEntry } from '@/lib/runtime-core/runtimeScriptTypes'

export type PublicRuntimeContainerPackagePayload = {
  bodyHtml: string
  styles: Array<{
    src: string
  }>
  scriptEntries: RuntimeScriptEntry[]
}

export type RuntimePackageRequestState = {
  queryString: string | null
  package: PublicRuntimeContainerPackagePayload | null
  status: 'idle' | 'loading' | 'loaded' | 'error'
  errorMessage: string | null
}

type RuntimePackageFetchEventDetails = Record<
  string,
  string | number | boolean | null
>

type UseRuntimePackageRequestInput = {
  songId: string
  runtimeApiBasePath: string
  runtimeQueryString: string
  shouldUseContainerRuntimeHost: boolean
  hasServerContainerRuntimePackage: boolean
  initialActivePackage: PublicRuntimeContainerPackagePayload | null
  recordRuntimePackageFetchEvent?: (
    type: 'runtime_package_fetch_start' | 'runtime_package_fetch_end',
    details?: RuntimePackageFetchEventDetails
  ) => void
}

export function useRuntimePackageRequest({
  songId,
  runtimeApiBasePath,
  runtimeQueryString,
  shouldUseContainerRuntimeHost,
  hasServerContainerRuntimePackage,
  initialActivePackage,
  recordRuntimePackageFetchEvent
}: UseRuntimePackageRequestInput) {
  const [runtimePackageRequest, setRuntimePackageRequest] =
    useState<RuntimePackageRequestState>({
      queryString: null,
      package: null,
      status: 'idle',
      errorMessage: null
    })
  const initialRuntimeQueryStringRef = useRef<string | null>(null)
  const runtimePackageKeyRef = useRef<string | null>(null)

  const activeContainerRuntimePackage = useMemo(
    () =>
      resolveActiveContainerRuntimePackage({
        initialRuntimeQueryString: initialRuntimeQueryStringRef.current,
        runtimeQueryString,
        serverPackage: initialActivePackage,
        clientPackageState: runtimePackageRequest
      }),
    [initialActivePackage, runtimePackageRequest, runtimeQueryString]
  )

  const isRuntimePackageLoading =
    shouldUseContainerRuntimeHost &&
    !activeContainerRuntimePackage &&
    runtimePackageRequest.queryString === runtimeQueryString &&
    runtimePackageRequest.status === 'loading'

  useEffect(() => {
    if (!shouldUseContainerRuntimeHost) {
      initialRuntimeQueryStringRef.current = null
      runtimePackageKeyRef.current = null
      setRuntimePackageRequest({
        queryString: null,
        package: null,
        status: 'idle',
        errorMessage: null
      })
      return
    }

    const packageKey = `${runtimeApiBasePath}:${songId}:container`
    if (runtimePackageKeyRef.current !== packageKey) {
      runtimePackageKeyRef.current = packageKey
      initialRuntimeQueryStringRef.current = hasServerContainerRuntimePackage
        ? runtimeQueryString
        : null
      setRuntimePackageRequest({
        queryString: null,
        package: null,
        status: 'idle',
        errorMessage: null
      })
      if (hasServerContainerRuntimePackage) {
        return
      }
    }

    if (
      hasServerContainerRuntimePackage &&
      runtimeQueryString === initialRuntimeQueryStringRef.current
    ) {
      setRuntimePackageRequest({
        queryString: null,
        package: null,
        status: 'idle',
        errorMessage: null
      })
      return
    }

    const abortController = new AbortController()
    const packageUrl = buildPublicRuntimeUrl(songId, {
      basePath: runtimeApiBasePath,
      params: runtimeQueryString
    })
    recordRuntimePackageFetchEvent?.('runtime_package_fetch_start', {
      queryStringLength: runtimeQueryString.length,
      hasPublicFeaturePlayback: runtimeQueryString.includes('public_feature=playback'),
      hasPublicFeatureMetronome: runtimeQueryString.includes('public_feature=metronome')
    })

    setRuntimePackageRequest({
      queryString: runtimeQueryString,
      package: null,
      status: 'loading',
      errorMessage: null
    })

    fetchRuntimeHtmlContainerPackage(packageUrl, {
      signal: abortController.signal
    })
      .then(nextPackage => {
        if (abortController.signal.aborted) {
          return
        }

        setRuntimePackageRequest({
          queryString: runtimeQueryString,
          package: nextPackage,
          status: 'loaded',
          errorMessage: null
        })
        recordRuntimePackageFetchEvent?.('runtime_package_fetch_end', {
          status: 'loaded',
          queryStringLength: runtimeQueryString.length
        })
      })
      .catch(error => {
        if (abortController.signal.aborted) {
          return
        }

        const errorMessage = getRuntimePackageErrorMessage(error)
        setRuntimePackageRequest({
          queryString: runtimeQueryString,
          package: null,
          status: 'error',
          errorMessage
        })
        recordRuntimePackageFetchEvent?.('runtime_package_fetch_end', {
          status: 'error',
          errorMessageLength: errorMessage.length,
          queryStringLength: runtimeQueryString.length
        })
      })

    return () => {
      abortController.abort()
    }
  }, [
    hasServerContainerRuntimePackage,
    runtimeApiBasePath,
    runtimeQueryString,
    recordRuntimePackageFetchEvent,
    shouldUseContainerRuntimeHost,
    songId
  ])

  return {
    runtimePackageRequest,
    activeContainerRuntimePackage,
    isRuntimePackageLoading
  }
}

function resolveActiveContainerRuntimePackage({
  initialRuntimeQueryString,
  runtimeQueryString,
  serverPackage,
  clientPackageState
}: {
  initialRuntimeQueryString: string | null
  runtimeQueryString: string
  serverPackage: PublicRuntimeContainerPackagePayload | null
  clientPackageState: RuntimePackageRequestState
}) {
  if (
    serverPackage &&
    (!initialRuntimeQueryString || runtimeQueryString === initialRuntimeQueryString)
  ) {
    return serverPackage
  }

  if (
    clientPackageState.queryString === runtimeQueryString &&
    clientPackageState.status === 'loaded'
  ) {
    return clientPackageState.package
  }

  return null
}

function getRuntimePackageErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error) {
    return error
  }

  return 'Please try the control again.'
}
