export type PublicRuntimeHostController = {
  hostElement: HTMLElement
  postMessage: (message: unknown) => boolean
}

export function createIframePublicRuntimeHostController(
  frame: HTMLIFrameElement | null
): PublicRuntimeHostController | null {
  if (!frame) {
    return null
  }

  return {
    hostElement: frame,
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
