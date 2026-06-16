export const PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE = 'vtabs-runtime-playback-open'
export const PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE = 'vtabs-runtime-playback-stop'
export const PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE = 'vtabs-runtime-playback-close-panel'
export const PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE = 'vtabs-runtime-playback-status'
export const PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE = 'vtabs-runtime-playback-panel-status'
export const PUBLIC_RUNTIME_SIZE_MESSAGE = 'vtabs-runtime-size'
export const PUBLIC_RUNTIME_READY_MESSAGE = 'vtabs-runtime-ready'
export const PUBLIC_RUNTIME_REDRAW_MESSAGE = 'vtabs-runtime-redraw'

export const PUBLIC_RUNTIME_CONTAINER_COMMAND_EVENT = 'vtabs-runtime-container-command'
export const PUBLIC_RUNTIME_HOST_MESSAGE_EVENT = 'vtabs-runtime-host-message'

export const PUBLIC_RUNTIME_HOST_COMMAND_MESSAGES = [
  PUBLIC_RUNTIME_PLAYBACK_OPEN_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STOP_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_CLOSE_PANEL_MESSAGE,
  PUBLIC_RUNTIME_REDRAW_MESSAGE
] as const

export const PUBLIC_RUNTIME_HOST_EVENT_MESSAGES = [
  PUBLIC_RUNTIME_READY_MESSAGE,
  PUBLIC_RUNTIME_SIZE_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE,
  PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE
] as const

export type PublicRuntimePlaybackStatus = 'idle' | 'loading' | 'playing'

export type PublicRuntimeHostCommandType = (typeof PUBLIC_RUNTIME_HOST_COMMAND_MESSAGES)[number]
export type PublicRuntimeHostEventType = (typeof PUBLIC_RUNTIME_HOST_EVENT_MESSAGES)[number]

export type PublicRuntimeHostCommandMessage = {
  type: PublicRuntimeHostCommandType
  songId: string
}

export type PublicRuntimeReadyMessage = {
  type: typeof PUBLIC_RUNTIME_READY_MESSAGE
  songId: string
}

export type PublicRuntimeSizeMessage = {
  type: typeof PUBLIC_RUNTIME_SIZE_MESSAGE
  songId: string
  height: number
}

export type PublicRuntimePlaybackStatusMessage = {
  type: typeof PUBLIC_RUNTIME_PLAYBACK_STATUS_MESSAGE
  songId: string
  status: PublicRuntimePlaybackStatus
}

export type PublicRuntimePlaybackPanelStatusMessage = {
  type: typeof PUBLIC_RUNTIME_PLAYBACK_PANEL_STATUS_MESSAGE
  songId: string
  isOpen: boolean
}

export type PublicRuntimeHostEventMessage =
  | PublicRuntimeReadyMessage
  | PublicRuntimeSizeMessage
  | PublicRuntimePlaybackStatusMessage
  | PublicRuntimePlaybackPanelStatusMessage

export type PublicRuntimeHostMessage =
  | PublicRuntimeHostCommandMessage
  | PublicRuntimeHostEventMessage

export function isPublicRuntimeHostCommandType(
  value: unknown
): value is PublicRuntimeHostCommandType {
  return (
    typeof value === 'string' &&
    PUBLIC_RUNTIME_HOST_COMMAND_MESSAGES.includes(value as PublicRuntimeHostCommandType)
  )
}

export function isPublicRuntimeHostEventType(
  value: unknown
): value is PublicRuntimeHostEventType {
  return (
    typeof value === 'string' &&
    PUBLIC_RUNTIME_HOST_EVENT_MESSAGES.includes(value as PublicRuntimeHostEventType)
  )
}

export function isPublicRuntimeHostMessage(value: unknown): value is PublicRuntimeHostMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as { type?: unknown; songId?: unknown }
  return (
    typeof candidate.songId === 'string' &&
    (isPublicRuntimeHostCommandType(candidate.type) || isPublicRuntimeHostEventType(candidate.type))
  )
}
