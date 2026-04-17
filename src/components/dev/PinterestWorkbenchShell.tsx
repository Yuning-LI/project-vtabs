'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

type PinterestWorkbenchShellProps = {
  footer: ReactNode
  controls: ReactNode
  children: ReactNode
}

export default function PinterestWorkbenchShell({
  footer,
  controls,
  children
}: PinterestWorkbenchShellProps) {
  const [isControlsOpen, setIsControlsOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (event.key === 'Escape') {
        setIsControlsOpen(false)
        return
      }

      if (isEditableTarget || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key === '.') {
        event.preventDefault()
        setIsControlsOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <section
        data-pinterest-export-root="true"
        className="w-full overflow-hidden bg-white"
      >
        <div className="relative bg-[#fcfaf7]">{children}</div>

        <button
          type="button"
          data-pinterest-export-end="true"
          onClick={() => setIsControlsOpen(true)}
          className="block w-full border-t border-[rgba(154,126,91,0.14)] bg-[linear-gradient(180deg,rgba(255,253,250,0.98)_0%,rgba(248,242,232,0.98)_100%)] text-left"
        >
          {footer}
        </button>
      </section>

      {isControlsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(33,24,18,0.38)] px-3 py-4 backdrop-blur-[6px] md:px-5 md:py-6"
          onClick={() => setIsControlsOpen(false)}
        >
          <div
            className="w-full max-w-6xl"
            onClick={event => event.stopPropagation()}
          >
            {controls}
          </div>
        </div>
      ) : null}
    </>
  )
}
