import type {
  PublicRuntimeHostController,
  PublicRuntimeHostMessage,
  PublicRuntimeHostMessageHandler
} from './runtime-host/types'
import {
  PUBLIC_RUNTIME_HOST_MESSAGE_EVENT,
  isPublicRuntimeHostMessage as isKnownPublicRuntimeHostMessage
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import {
  getBrowserWindow,
  isAllowedRuntimeHostOrigin
} from '@/lib/runtime-core/client/browserEnvironment'

export type {
  PublicRuntimeHostController,
  PublicRuntimeHostMessage,
  PublicRuntimeHostMessageHandler
} from './runtime-host/types'

const noopPublicRuntimeHostUnsubscribe = () => {}

export function subscribeToPublicRuntimeHostMessages(
  songId: string,
  handler: PublicRuntimeHostMessageHandler
) {
  const runtimeWindow = getBrowserWindow()
  if (!runtimeWindow) {
    return noopPublicRuntimeHostUnsubscribe
  }
  const browserWindow = runtimeWindow

  function handleRuntimeHostMessage(event: Event) {
    const detail = event instanceof CustomEvent ? event.detail : null
    const origin = readRuntimeHostMessageOrigin(detail, browserWindow)
    if (!isAllowedRuntimeHostOrigin(origin)) {
      return
    }

    const data = readRuntimeHostMessageData(detail)
    if (!isPublicRuntimeHostMessage(data, songId)) {
      return
    }

    handler(data, {
      origin: origin ?? browserWindow.location.origin,
      source: 'container-event'
    })
  }

  browserWindow.addEventListener(PUBLIC_RUNTIME_HOST_MESSAGE_EVENT, handleRuntimeHostMessage)
  return () => {
    browserWindow.removeEventListener(PUBLIC_RUNTIME_HOST_MESSAGE_EVENT, handleRuntimeHostMessage)
  }
}

function isPublicRuntimeHostMessage(
  value: unknown,
  songId: string
): value is PublicRuntimeHostMessage {
  return isKnownPublicRuntimeHostMessage(value) && value.songId === songId
}

function readRuntimeHostMessageData(detail: unknown) {
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return (detail as { message?: unknown }).message
  }

  return detail
}

function readRuntimeHostMessageOrigin(detail: unknown, runtimeWindow: Window) {
  if (detail && typeof detail === 'object' && 'origin' in detail) {
    const origin = (detail as { origin?: unknown }).origin
    return typeof origin === 'string' ? origin : null
  }

  return runtimeWindow.location.origin
}
