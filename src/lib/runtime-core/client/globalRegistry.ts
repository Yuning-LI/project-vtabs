'use client'

import { PUBLIC_RUNTIME_GLOBAL_NAMES } from './runtimeGlobalInventory'

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

export type PublicRuntimeGlobalRegistry = {
  runtimeWindow: Window
  globals: Record<string, unknown>
  captureRuntimeGlobals: () => Record<string, unknown>
  getTrackedEventListenerCount: () => number
  restoreShellGlobals: () => void
  dispose: () => void
}

export type CreatePublicRuntimeGlobalRegistryOptions = {
  runtimeWindow?: Window
  globalNames?: readonly string[]
}

export function createPublicRuntimeGlobalRegistry({
  runtimeWindow = window,
  globalNames = PUBLIC_RUNTIME_GLOBAL_NAMES
}: CreatePublicRuntimeGlobalRegistryOptions = {}): PublicRuntimeGlobalRegistry {
  const snapshot = captureShellGlobalSnapshot(runtimeWindow, globalNames)
  const eventCapture = installRuntimeEventListenerCapture(runtimeWindow)
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

  function dispose() {
    if (disposed) {
      return
    }
    captureRuntimeGlobals()
    eventCapture.dispose()
    restoreShellGlobals()
    disposed = true
  }

  return {
    runtimeWindow,
    globals,
    captureRuntimeGlobals,
    getTrackedEventListenerCount: eventCapture.getTrackedEventListenerCount,
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

function installRuntimeEventListenerCapture(runtimeWindow: Window) {
  const eventTargetPrototype = globalThis.EventTarget?.prototype
  const records: RuntimeEventListenerRecord[] = []
  let disposed = false

  if (!eventTargetPrototype) {
    return {
      getTrackedEventListenerCount: () => 0,
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
    if (!disposed && listener) {
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
    dispose() {
      if (disposed) {
        return
      }
      disposed = true

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
