'use client'

import {
  getBrowserDocument,
  getBrowserWindow
} from './browserEnvironment'

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

type PublicRuntimeContextLoadCallback = (context: unknown) => void

type PublicRuntimeKitContext = {
  context?: unknown
  callbacks?: PublicRuntimeContextLoadCallback[]
  triggerLoad?: () => unknown
  onLoad?: (callback: PublicRuntimeContextLoadCallback) => unknown
  __vtabsPublicRuntimeContextLoadGuard?: PublicRuntimeContextLoadGuardState
}

type PublicRuntimeContextLoadGuardState = {
  loaded: boolean
  mountElement: HTMLElement
  originalTriggerLoad: () => unknown
  originalOnLoad: ((callback: PublicRuntimeContextLoadCallback) => unknown) | null
  executedCallbacks: Set<PublicRuntimeContextLoadCallback>
}

const PUBLIC_RUNTIME_DOM_MOUNT_DATA_KEY = 'publicRuntimeDomMount'
const PUBLIC_RUNTIME_BODY_APPEND_MOUNT_DATA_KEY = 'publicRuntimeBodyAppendMount'
const PUBLIC_RUNTIME_CONTEXT_STARTED_DATA_KEY = 'publicRuntimeContextStarted'
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
  const runtimeDocument = getBrowserDocument()
  if (!runtimeDocument) {
    throw new Error('Runtime container bootstrap requires a browser document')
  }

  const mountElement = runtimeDocument.createElement('div')
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
  const runtimeWindow = getBrowserWindow() as
    | (Window & {
    Kit?: {
      context?: PublicRuntimeKitContext
    }
  })
    | null

  if (runtimeWindow) {
    installPublicRuntimeContextLoadGuard(mountElement, runtimeWindow)
  }

  if (!shouldTriggerPublicRuntimeContextLoad(mountElement)) {
    return false
  }

  if (typeof runtimeWindow?.Kit?.context?.triggerLoad !== 'function') {
    return false
  }

  markPublicRuntimeContextStarted(mountElement)
  runtimeWindow.Kit.context.triggerLoad()
  return true
}

export function shouldTriggerPublicRuntimeContextLoad(mountElement: HTMLElement) {
  if (mountElement.dataset[PUBLIC_RUNTIME_CONTEXT_STARTED_DATA_KEY] === 'true') {
    return false
  }

  const sheet = mountElement.querySelector(PUBLIC_RUNTIME_SHEET_SELECTOR)
  if (sheet?.querySelector(PUBLIC_RUNTIME_RENDERED_SHEET_SELECTOR)) {
    markPublicRuntimeContextStarted(mountElement)
    return false
  }

  return true
}

export function markPublicRuntimeContextStarted(mountElement: HTMLElement) {
  mountElement.dataset[PUBLIC_RUNTIME_CONTEXT_STARTED_DATA_KEY] = 'true'
}

export function installPublicRuntimeContextLoadGuard(
  mountElement: HTMLElement,
  runtimeWindow: Window
) {
  const runtimeContext = (runtimeWindow as Window & {
    Kit?: {
      context?: PublicRuntimeKitContext
    }
  }).Kit?.context

  if (!runtimeContext || typeof runtimeContext.triggerLoad !== 'function') {
    return false
  }

  const existingGuard = runtimeContext.__vtabsPublicRuntimeContextLoadGuard
  if (existingGuard) {
    existingGuard.mountElement = mountElement
    if (hasPublicRuntimeContextStartedEvidence(mountElement, runtimeWindow)) {
      existingGuard.loaded = true
      markPublicRuntimeContextStarted(mountElement)
      markExistingRuntimeCallbacksExecuted(runtimeContext, existingGuard)
    }
    return true
  }

  const guardState: PublicRuntimeContextLoadGuardState = {
    loaded: hasPublicRuntimeContextStartedEvidence(mountElement, runtimeWindow),
    mountElement,
    originalTriggerLoad: runtimeContext.triggerLoad,
    originalOnLoad:
      typeof runtimeContext.onLoad === 'function' ? runtimeContext.onLoad : null,
    executedCallbacks: new Set()
  }

  if (guardState.loaded) {
    markPublicRuntimeContextStarted(mountElement)
    markExistingRuntimeCallbacksExecuted(runtimeContext, guardState)
  }

  runtimeContext.triggerLoad = function guardedPublicRuntimeTriggerLoad() {
    if (guardState.loaded) {
      markPublicRuntimeContextStarted(guardState.mountElement)
      runPendingRuntimeContextCallbacks(runtimeContext, guardState)
      return runtimeContext.context
    }

    guardState.loaded = true
    markPublicRuntimeContextStarted(guardState.mountElement)
    const result = guardState.originalTriggerLoad.apply(this)
    markExistingRuntimeCallbacksExecuted(runtimeContext, guardState)
    return result
  }

  runtimeContext.onLoad = function guardedPublicRuntimeOnLoad(callback) {
    const result = guardState.originalOnLoad
      ? guardState.originalOnLoad.apply(this, [callback])
      : pushRuntimeContextCallback(runtimeContext, callback)

    if (guardState.loaded && !guardState.executedCallbacks.has(callback)) {
      guardState.executedCallbacks.add(callback)
      callback(runtimeContext.context)
    }

    return result
  }

  runtimeContext.__vtabsPublicRuntimeContextLoadGuard = guardState
  return true
}

function pushRuntimeContextCallback(
  runtimeContext: PublicRuntimeKitContext,
  callback: PublicRuntimeContextLoadCallback
) {
  if (!runtimeContext.callbacks) {
    runtimeContext.callbacks = []
  }
  runtimeContext.callbacks.push(callback)
  return runtimeContext.context
}

function runPendingRuntimeContextCallbacks(
  runtimeContext: PublicRuntimeKitContext,
  guardState: PublicRuntimeContextLoadGuardState
) {
  runtimeContext.callbacks?.forEach(callback => {
    if (guardState.executedCallbacks.has(callback)) {
      return
    }
    guardState.executedCallbacks.add(callback)
    callback(runtimeContext.context)
  })
}

function markExistingRuntimeCallbacksExecuted(
  runtimeContext: PublicRuntimeKitContext,
  guardState: PublicRuntimeContextLoadGuardState
) {
  runtimeContext.callbacks?.forEach(callback => {
    guardState.executedCallbacks.add(callback)
  })
}

function hasPublicRuntimeContextStartedEvidence(
  mountElement: HTMLElement,
  runtimeWindow: Window
) {
  const sheet = mountElement.querySelector(PUBLIC_RUNTIME_SHEET_SELECTOR)
  if (sheet?.querySelector(PUBLIC_RUNTIME_RENDERED_SHEET_SELECTOR)) {
    return true
  }

  const runtimeSong = (runtimeWindow as Window & {
    Song?: {
      midiPlayer?: unknown
    }
  }).Song
  return Boolean(runtimeSong?.midiPlayer)
}

function installBodyAppendCapture(mountElement: HTMLElement) {
  const runtimeDocument = getBrowserDocument()
  if (!runtimeDocument?.body) {
    return {
      dispose() {}
    }
  }

  const runtimeExtraMount = runtimeDocument.createElement('div')
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

  observer.observe(runtimeDocument.body, {
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
