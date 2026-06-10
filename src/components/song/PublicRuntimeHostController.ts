export type PublicRuntimeHostController = {
  hostElement: HTMLElement
  containsEventTarget: (target: EventTarget | null) => boolean
  postMessage: (message: unknown) => boolean
}

export type PublicRuntimeHostMessage = Record<string, unknown> & {
  songId: string
  type?: unknown
}

export type PublicRuntimeHostMessageHandler = (message: PublicRuntimeHostMessage) => void

export function createIframePublicRuntimeHostController(
  frame: HTMLIFrameElement | null
): PublicRuntimeHostController | null {
  if (!frame) {
    return null
  }

  return {
    hostElement: frame,
    containsEventTarget(target) {
      return target === frame
    },
    postMessage(message) {
      if (typeof window === 'undefined') {
        return false
      }

      const frameWindow = frame.contentWindow
      if (!frameWindow) {
        return false
      }

      frameWindow.postMessage(message, window.location.origin)
      return true
    }
  }
}

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
