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

const PUBLIC_RUNTIME_DOM_MOUNT_DATA_KEY = 'publicRuntimeDomMount'
const PUBLIC_RUNTIME_BODY_APPEND_MOUNT_DATA_KEY = 'publicRuntimeBodyAppendMount'
const PUBLIC_RUNTIME_ROOT_SELECTOR = '[data-public-runtime-root]'
const PUBLIC_RUNTIME_SHEET_SELECTOR = '#sheet'
const PUBLIC_RUNTIME_RENDERED_SHEET_SELECTOR = 'svg, .sheet-svg'
const PUBLIC_RUNTIME_BODY_APPEND_NODE_CLASSES = [
  'print-hint',
  'lean-overlay',
  'modal-overlay'
] as const
const PUBLIC_RUNTIME_BODY_APPEND_NODE_ID_PREFIXES = [
  'materialize-lean-overlay-'
] as const
const PUBLIC_RUNTIME_CONTAINER_PANEL_SELECTOR = '#play-modal, #metronome-modal, #nosound-modal'
const PUBLIC_RUNTIME_OVERLAY_SELECTOR = '.lean-overlay, .modal-overlay, [id^="materialize-lean-overlay-"]'

export function bootstrapPublicRuntimeContainer({
  root,
  bodyHtml
}: BootstrapPublicRuntimeContainerOptions): PublicRuntimeContainerBootstrapController {
  const mountElement = document.createElement('div')
  mountElement.dataset[PUBLIC_RUNTIME_DOM_MOUNT_DATA_KEY] = 'true'
  mountElement.innerHTML = bodyHtml
  root.appendChild(mountElement)
  const bodyAppendCapture = installBodyAppendCapture(mountElement)

  return {
    mountElement,
    sheetElement: mountElement.querySelector<HTMLElement>(PUBLIC_RUNTIME_SHEET_SELECTOR),
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
  const sheet = mountElement.querySelector(PUBLIC_RUNTIME_SHEET_SELECTOR)
  if (sheet?.querySelector(PUBLIC_RUNTIME_RENDERED_SHEET_SELECTOR)) {
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
  runtimeExtraMount.dataset[PUBLIC_RUNTIME_BODY_APPEND_MOUNT_DATA_KEY] = 'true'
  runtimeExtraMount.hidden = true
  mountElement.appendChild(runtimeExtraMount)

  /* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) {
          return
        }
        if (node.closest(PUBLIC_RUNTIME_ROOT_SELECTOR)) {
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
  /* TODO: 快乐谱代码，用途待核验，暂保留 */
  return (
    PUBLIC_RUNTIME_BODY_APPEND_NODE_CLASSES.some(className => node.classList.contains(className)) ||
    PUBLIC_RUNTIME_BODY_APPEND_NODE_ID_PREFIXES.some(prefix => node.id.startsWith(prefix))
  )
}

function closeRuntimeContainerPanels(mountElement: HTMLElement) {
  /* KEEP: 功能已迁移至自有界面，底层逻辑复用，禁止删除 */
  mountElement
    .querySelectorAll<HTMLElement>(PUBLIC_RUNTIME_CONTAINER_PANEL_SELECTOR)
    .forEach(hideRuntimeContainerPanel)

  mountElement
    .querySelectorAll<HTMLElement>(PUBLIC_RUNTIME_OVERLAY_SELECTOR)
    .forEach(node => {
      node.remove()
    })
}

function hideRuntimeContainerPanel(panel: HTMLElement) {
  panel.removeAttribute('data-public-runtime-container-panel')
  panel.style.display = 'none'
  panel.style.visibility = 'hidden'
  panel.style.opacity = '0'
}
