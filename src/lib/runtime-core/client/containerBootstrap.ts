'use client'

export type PublicRuntimeContainerBootstrapController = {
  mountElement: HTMLElement
  sheetElement: HTMLElement | null
  ensureStarted: () => boolean
  dispose: () => void
}

export type BootstrapPublicRuntimeContainerOptions = {
  root: HTMLElement
  bodyHtml: string
}

export function bootstrapPublicRuntimeContainer({
  root,
  bodyHtml
}: BootstrapPublicRuntimeContainerOptions): PublicRuntimeContainerBootstrapController {
  const mountElement = document.createElement('div')
  mountElement.dataset.publicRuntimeDomMount = 'true'
  mountElement.innerHTML = bodyHtml
  root.appendChild(mountElement)

  return {
    mountElement,
    sheetElement: mountElement.querySelector<HTMLElement>('#sheet'),
    ensureStarted() {
      return triggerRuntimeContextLoadIfNeeded(mountElement)
    },
    dispose() {
      mountElement.remove()
    }
  }
}

function triggerRuntimeContextLoadIfNeeded(mountElement: HTMLElement) {
  const sheet = mountElement.querySelector('#sheet')
  if (sheet?.querySelector('svg, .sheet-svg')) {
    return false
  }

  const runtimeWindow = window as unknown as {
    Kit?: {
      context?: {
        triggerLoad?: () => unknown
      }
    }
  }

  if (typeof runtimeWindow.Kit?.context?.triggerLoad !== 'function') {
    return false
  }

  runtimeWindow.Kit.context.triggerLoad()
  return true
}
