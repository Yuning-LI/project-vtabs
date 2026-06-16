'use client'

import {
  PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT,
  PUBLIC_RUNTIME_HOST_MESSAGE_EVENT,
  isPublicRuntimeHostCommandType,
  isPublicRuntimeHostEventType,
  type PublicRuntimeHostCommandMessage,
  type PublicRuntimeHostEventMessage
} from '@/lib/runtime-core/bridge/publicRuntimeMessageTypes'
import { getBrowserWindow } from '@/lib/runtime-core/client/browserEnvironment'

export function dispatchContainerRuntimeCommand(message: unknown) {
  const runtimeWindow = getBrowserWindow()
  if (!isPublicRuntimeHostCommandMessage(message)) {
    return false
  }
  if (!runtimeWindow) {
    return false
  }

  runtimeWindow.dispatchEvent(
    new CustomEvent(PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT, {
      detail: message
    })
  )
  return true
}

export function dispatchContainerRuntimeHostMessage(message: unknown) {
  const runtimeWindow = getBrowserWindow()
  if (!isPublicRuntimeHostEventMessage(message)) {
    return false
  }
  if (!runtimeWindow) {
    return false
  }

  runtimeWindow.dispatchEvent(
    new CustomEvent(PUBLIC_RUNTIME_HOST_MESSAGE_EVENT, {
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

function isPublicRuntimeHostEventMessage(
  value: unknown
): value is PublicRuntimeHostEventMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { type?: unknown; songId?: unknown }
  return typeof candidate.songId === 'string' && isPublicRuntimeHostEventType(candidate.type)
}
