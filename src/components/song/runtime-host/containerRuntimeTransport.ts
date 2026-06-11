'use client'

import {
  isPublicRuntimeHostCommandType,
  type PublicRuntimeHostCommandMessage
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'

export const PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT = 'vtabs-runtime-container-command'

export function dispatchContainerRuntimeCommand(message: unknown) {
  if (!isPublicRuntimeHostCommandMessage(message)) {
    return false
  }

  window.dispatchEvent(
    new MessageEvent('message', {
      data: message,
      origin: window.location.origin,
      source: window
    })
  )
  window.dispatchEvent(
    new CustomEvent(PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT, {
      detail: message
    })
  )
  return true
}

function isPublicRuntimeHostCommandMessage(
  value: unknown
): value is PublicRuntimeHostCommandMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { type?: unknown; songId?: unknown }
  return typeof candidate.songId === 'string' && isPublicRuntimeHostCommandType(candidate.type)
}
