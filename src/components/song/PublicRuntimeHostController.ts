import type {
  PublicRuntimeHostController,
  PublicRuntimeHostMessage,
  PublicRuntimeHostMessageHandler
} from './runtime-host/types'

export type {
  PublicRuntimeHostController,
  PublicRuntimeHostMessage,
  PublicRuntimeHostMessageHandler
} from './runtime-host/types'

export function subscribeToPublicRuntimeHostMessages(
  songId: string,
  handler: PublicRuntimeHostMessageHandler
) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) {
      return
    }

    const data = event.data
    if (!isPublicRuntimeHostMessage(data, songId)) {
      return
    }

    handler(data)
  }

  window.addEventListener('message', handleMessage)
  return () => {
    window.removeEventListener('message', handleMessage)
  }
}

function isPublicRuntimeHostMessage(
  value: unknown,
  songId: string
): value is PublicRuntimeHostMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'songId' in value &&
      (value as { songId?: unknown }).songId === songId
  )
}
