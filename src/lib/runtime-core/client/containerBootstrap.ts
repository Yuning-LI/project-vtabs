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
  const bodyAppendCapture = installBodyAppendCapture(mountElement)

  return {
    mountElement,
    sheetElement: mountElement.querySelector<HTMLElement>('#sheet'),
    ensureStarted() {
      return triggerRuntimeContextLoadIfNeeded(mountElement)
    },
    dispose() {
      closeRuntimeContainerPanels(mountElement)
      bodyAppendCapture.dispose()
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

function installBodyAppendCapture(mountElement: HTMLElement) {
  const runtimeExtraMount = document.createElement('div')
  runtimeExtraMount.dataset.publicRuntimeBodyAppendMount = 'true'
  runtimeExtraMount.hidden = true
  mountElement.appendChild(runtimeExtraMount)

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) {
          return
        }
        if (node.closest('[data-public-runtime-root]')) {
          return
        }
        if (isRuntimeBodyAppendNode(node)) {
          runtimeExtraMount.appendChild(node)
        }
      })
    })
  })

  observer.observe(document.body, {
    childList: true
  })

  return {
    dispose() {
      observer.disconnect()
      runtimeExtraMount.remove()
    }
  }
}

function isRuntimeBodyAppendNode(node: HTMLElement) {
  return (
    node.classList.contains('print-hint') ||
    node.classList.contains('lean-overlay') ||
    node.classList.contains('modal-overlay') ||
    node.id.startsWith('materialize-lean-overlay-')
  )
}

function closeRuntimeContainerPanels(mountElement: HTMLElement) {
  mountElement
    .querySelectorAll<HTMLElement>('#play-modal, #metronome-modal, #nosound-modal')
    .forEach(panel => {
      panel.removeAttribute('data-public-runtime-container-panel')
      panel.style.display = 'none'
      panel.style.visibility = 'hidden'
      panel.style.opacity = '0'
    })

  mountElement
    .querySelectorAll<HTMLElement>('.lean-overlay, .modal-overlay, [id^="materialize-lean-overlay-"]')
    .forEach(node => {
      node.remove()
    })
}
