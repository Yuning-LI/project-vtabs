'use client'

import { PUBLIC_RUNTIME_GLOBAL_NAMES } from './runtimeGlobalInventory'
import { getBrowserWindow } from './browserEnvironment'

type GlobalSnapshotEntry = {
  existed: boolean
  value: unknown
}

type RuntimeEventListenerRecord = {
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
  options?: boolean | AddEventListenerOptions
  capture: boolean
}

type RuntimeTimerCapture = {
  getTrackedTimerCount: () => number
  sealCapture: () => void
  dispose: () => void
}

type RuntimeEventListenerCapture = {
  getTrackedEventListenerCount: () => number
  sealCapture: () => void
  dispose: () => void
}

export type PublicRuntimeGlobalRegistry = {
  runtimeWindow: Window
  globals: Record<string, unknown>
  captureRuntimeGlobals: () => Record<string, unknown>
  sealRuntimeSideEffectCapture: () => void
  getTrackedEventListenerCount: () => number
  getTrackedTimerCount: () => number
  restoreShellGlobals: () => void
  dispose: () => void
}

export type CreatePublicRuntimeGlobalRegistryOptions = {
  runtimeWindow?: Window
  globalNames?: readonly string[]
}

export function createPublicRuntimeGlobalRegistry({
  runtimeWindow = getBrowserWindow() ?? (globalThis as unknown as Window),
  globalNames = PUBLIC_RUNTIME_GLOBAL_NAMES
}: CreatePublicRuntimeGlobalRegistryOptions = {}): PublicRuntimeGlobalRegistry {
  const snapshot = captureShellGlobalSnapshot(runtimeWindow, globalNames)
  const eventCapture = installRuntimeEventListenerCapture(runtimeWindow)
  const timerCapture = installRuntimeTimerCapture(runtimeWindow)
  const globals: Record<string, unknown> = {}
  let disposed = false

  function captureRuntimeGlobals() {
    if (disposed) {
      return globals
    }

    globalNames.forEach(name => {
      if (hasWindowOwnProperty(runtimeWindow, name)) {
        globals[name] = readWindowValue(runtimeWindow, name)
      } else {
        delete globals[name]
      }
    })

    return globals
  }

  function restoreShellGlobals() {
    restoreShellGlobalSnapshot(runtimeWindow, snapshot)
  }

  function sealRuntimeSideEffectCapture() {
    eventCapture.sealCapture()
    timerCapture.sealCapture()
  }

  function dispose() {
    if (disposed) {
      return
    }
    captureRuntimeGlobals()
    eventCapture.dispose()
    timerCapture.dispose()
    restoreShellGlobals()
    disposed = true
  }

  return {
    runtimeWindow,
    globals,
    captureRuntimeGlobals,
    sealRuntimeSideEffectCapture,
    getTrackedEventListenerCount: eventCapture.getTrackedEventListenerCount,
    getTrackedTimerCount: timerCapture.getTrackedTimerCount,
    restoreShellGlobals,
    dispose
  }
}

function captureShellGlobalSnapshot(runtimeWindow: Window, globalNames: readonly string[]) {
  const snapshot: Record<string, GlobalSnapshotEntry> = {}

  globalNames.forEach(name => {
    snapshot[name] = {
      existed: hasWindowOwnProperty(runtimeWindow, name),
      value: readWindowValue(runtimeWindow, name)
    }
  })

  return snapshot
}

function restoreShellGlobalSnapshot(
  runtimeWindow: Window,
  snapshot: Record<string, GlobalSnapshotEntry>
) {
  Object.entries(snapshot).forEach(([name, entry]) => {
    if (entry.existed) {
      writeWindowValue(runtimeWindow, name, entry.value)
    } else {
      deleteWindowValue(runtimeWindow, name)
    }
  })
}

function hasWindowOwnProperty(runtimeWindow: Window, name: string) {
  return Object.prototype.hasOwnProperty.call(runtimeWindow, name)
}

function readWindowValue(runtimeWindow: Window, name: string) {
  return (runtimeWindow as unknown as Record<string, unknown>)[name]
}

function writeWindowValue(runtimeWindow: Window, name: string, value: unknown) {
  ;(runtimeWindow as unknown as Record<string, unknown>)[name] = value
}

function deleteWindowValue(runtimeWindow: Window, name: string) {
  try {
    delete (runtimeWindow as unknown as Record<string, unknown>)[name]
  } catch {
    writeWindowValue(runtimeWindow, name, undefined)
  }
}

function installRuntimeEventListenerCapture(runtimeWindow: Window): RuntimeEventListenerCapture {
  const eventTargetPrototype = globalThis.EventTarget?.prototype
  const records: RuntimeEventListenerRecord[] = []
  let disposed = false
  let tracking = true

  if (!eventTargetPrototype) {
    return {
      getTrackedEventListenerCount: () => 0,
      sealCapture() {},
      dispose() {}
    }
  }

  const originalAddEventListener = eventTargetPrototype.addEventListener
  const originalRemoveEventListener = eventTargetPrototype.removeEventListener

  eventTargetPrototype.addEventListener = function patchedAddEventListener(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (tracking && !disposed && listener) {
      records.push({
        target: this,
        type,
        listener,
        options,
        capture: getCaptureOption(options)
      })
    }

    return originalAddEventListener.call(this, type, listener, options)
  }

  eventTargetPrototype.removeEventListener = function patchedRemoveEventListener(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) {
    if (listener) {
      removeTrackedEventListener(records, this, type, listener, getCaptureOption(options))
    }

    return originalRemoveEventListener.call(this, type, listener, options)
  }

  return {
    getTrackedEventListenerCount: () => records.length,
    sealCapture() {
      if (!tracking || disposed) {
        return
      }
      tracking = false
      eventTargetPrototype.addEventListener = originalAddEventListener
      eventTargetPrototype.removeEventListener = originalRemoveEventListener
    },
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      tracking = false

      records.splice(0).forEach(record => {
        originalRemoveEventListener.call(
          record.target,
          record.type,
          record.listener,
          record.options
        )
      })

      eventTargetPrototype.addEventListener = originalAddEventListener
      eventTargetPrototype.removeEventListener = originalRemoveEventListener
    }
  }
}

function removeTrackedEventListener(
  records: RuntimeEventListenerRecord[],
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  capture: boolean
) {
  const index = records.findIndex(
    record =>
      record.target === target &&
      record.type === type &&
      record.listener === listener &&
      record.capture === capture
  )

  if (index >= 0) {
    records.splice(index, 1)
  }
}

function getCaptureOption(options: boolean | AddEventListenerOptions | undefined) {
  return typeof options === 'boolean' ? options : Boolean(options?.capture)
}

function installRuntimeTimerCapture(runtimeWindow: Window): RuntimeTimerCapture {
  const trackedTimeouts = new Set<number>()
  const trackedIntervals = new Set<number>()
  let disposed = false
  let tracking = true
  const originalSetTimeout = runtimeWindow.setTimeout.bind(runtimeWindow)
  const originalClearTimeout = runtimeWindow.clearTimeout.bind(runtimeWindow)
  const originalSetInterval = runtimeWindow.setInterval.bind(runtimeWindow)
  const originalClearInterval = runtimeWindow.clearInterval.bind(runtimeWindow)

  runtimeWindow.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = originalSetTimeout(handler, timeout, ...args)
    if (tracking && !disposed) {
      trackedTimeouts.add(id)
    }
    return id
  }) as typeof window.setTimeout

  runtimeWindow.clearTimeout = ((id?: number) => {
    if (typeof id === 'number') {
      trackedTimeouts.delete(id)
    }
    return originalClearTimeout(id)
  }) as typeof window.clearTimeout

  runtimeWindow.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = originalSetInterval(handler, timeout, ...args)
    if (tracking && !disposed) {
      trackedIntervals.add(id)
    }
    return id
  }) as typeof window.setInterval

  runtimeWindow.clearInterval = ((id?: number) => {
    if (typeof id === 'number') {
      trackedIntervals.delete(id)
    }
    return originalClearInterval(id)
  }) as typeof window.clearInterval

  return {
    getTrackedTimerCount: () => trackedTimeouts.size + trackedIntervals.size,
    sealCapture() {
      if (!tracking || disposed) {
        return
      }
      tracking = false
      runtimeWindow.setTimeout = originalSetTimeout as typeof window.setTimeout
      runtimeWindow.clearTimeout = originalClearTimeout as typeof window.clearTimeout
      runtimeWindow.setInterval = originalSetInterval as typeof window.setInterval
      runtimeWindow.clearInterval = originalClearInterval as typeof window.clearInterval
    },
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      tracking = false

      trackedTimeouts.forEach(id => originalClearTimeout(id))
      trackedIntervals.forEach(id => originalClearInterval(id))
      trackedTimeouts.clear()
      trackedIntervals.clear()

      runtimeWindow.setTimeout = originalSetTimeout as typeof window.setTimeout
      runtimeWindow.clearTimeout = originalClearTimeout as typeof window.clearTimeout
      runtimeWindow.setInterval = originalSetInterval as typeof window.setInterval
      runtimeWindow.clearInterval = originalClearInterval as typeof window.clearInterval
    }
  }
}
