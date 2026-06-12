'use client'

import { useEffect } from 'react'

type UseRuntimeHostLifecycleOptions = {
  rootElement: HTMLElement | null
  runtimeRoot: HTMLElement | null
  enabled: boolean
}

const MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES = [
  'data-vtabs-letter-track-pending',
  'data-vtabs-public-metronome',
  'data-vtabs-public-playback'
] as const

type AttributeSnapshot = Record<
  (typeof MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES)[number],
  string | null
>

export function useRuntimeHostLifecycle({
  rootElement,
  runtimeRoot,
  enabled
}: UseRuntimeHostLifecycleOptions) {
  useEffect(() => {
    if (!enabled || !rootElement) {
      return
    }

    const hostRoot = rootElement
    const documentElement = document.documentElement
    const snapshot = captureRuntimeDocumentAttributeSnapshot(documentElement)

    function syncRuntimeDocumentAttributes() {
      MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES.forEach(name => {
        const value = documentElement.getAttribute(name)
        if (value === null) {
          hostRoot.removeAttribute(name)
        } else {
          hostRoot.setAttribute(name, value)
        }
      })
    }

    syncRuntimeDocumentAttributes()

    const observer = new MutationObserver(syncRuntimeDocumentAttributes)
    observer.observe(documentElement, {
      attributes: true,
      attributeFilter: [...MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES]
    })

    return () => {
      observer.disconnect()
      cleanupRuntimeHostDom(runtimeRoot)
      restoreRuntimeDocumentAttributeSnapshot(documentElement, snapshot)
      MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES.forEach(name => {
        hostRoot.removeAttribute(name)
      })
    }
  }, [enabled, rootElement, runtimeRoot])
}

function captureRuntimeDocumentAttributeSnapshot(
  documentElement: HTMLElement
): AttributeSnapshot {
  return MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES.reduce((snapshot, name) => {
    snapshot[name] = documentElement.getAttribute(name)
    return snapshot
  }, {} as AttributeSnapshot)
}

function restoreRuntimeDocumentAttributeSnapshot(
  documentElement: HTMLElement,
  snapshot: AttributeSnapshot
) {
  MIRRORED_RUNTIME_DOCUMENT_ATTRIBUTES.forEach(name => {
    const value = snapshot[name]
    if (value === null) {
      documentElement.removeAttribute(name)
    } else {
      documentElement.setAttribute(name, value)
    }
  })
}

function cleanupRuntimeHostDom(runtimeRoot: HTMLElement | null) {
  if (!runtimeRoot) {
    return
  }

  closeRuntimePanel(runtimeRoot.querySelector<HTMLElement>('#play-modal'))
  closeRuntimePanel(runtimeRoot.querySelector<HTMLElement>('#metronome-modal'))
  runtimeRoot
    .querySelectorAll<HTMLElement>('.lean-overlay, [id^="materialize-lean-overlay-"]')
    .forEach(node => {
      node.remove()
    })
  runtimeRoot.replaceChildren()
}

function closeRuntimePanel(panel: HTMLElement | null) {
  if (!panel) {
    return
  }

  panel.removeAttribute('data-public-runtime-container-panel')
  panel.style.display = 'none'
  panel.style.visibility = 'hidden'
  panel.style.opacity = '0'
}
