'use client'

import { useEffect, useState } from 'react'
import { scopeRuntimeCss } from '@/lib/runtime-core/client/styleScope'

export type RuntimeStyleAsset = {
  src: string
}

type RuntimeStyleInjectorProps = {
  assets: RuntimeStyleAsset[]
  rootSelector?: string
}

export default function RuntimeStyleInjector({
  assets,
  rootSelector = '[data-public-runtime-root]'
}: RuntimeStyleInjectorProps) {
  const [scopedCss, setScopedCss] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStyles() {
      const cssParts = await Promise.all(
        assets.map(async asset => {
          const response = await fetch(asset.src)
          if (!response.ok) {
            throw new Error(`Failed to load runtime CSS: ${asset.src}`)
          }
          return scopeRuntimeCss(await response.text(), rootSelector)
        })
      )

      if (!cancelled) {
        setScopedCss(cssParts.join('\n'))
      }
    }

    if (assets.length === 0) {
      setScopedCss('')
      return () => {
        cancelled = true
      }
    }

    loadStyles().catch(error => {
      if (!cancelled) {
        console.error(error)
        setScopedCss('')
      }
    })

    return () => {
      cancelled = true
    }
  }, [assets, rootSelector])

  return (
    <>
      <style data-public-runtime-container-constraints suppressHydrationWarning>
        {buildRuntimeContainerConstraintCss(rootSelector)}
      </style>
      {scopedCss ? (
        <style data-public-runtime-scoped-css suppressHydrationWarning>
          {scopedCss}
        </style>
      ) : null}
    </>
  )
}

function buildRuntimeContainerConstraintCss(rootSelector: string) {
  return `
${rootSelector} {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

${rootSelector} [data-public-runtime-dom-root] {
  position: relative;
  overflow: hidden;
  min-height: 520px;
  background: #fffaf1;
}

${rootSelector} [data-public-runtime-dom-mount="true"] {
  position: relative;
  overflow: hidden;
  min-height: 520px;
}

${rootSelector} [data-public-runtime-dom-mount] #header,
${rootSelector} [data-public-runtime-dom-mount] .head-bar,
${rootSelector} [data-public-runtime-dom-mount] .nav-wrapper,
${rootSelector} [data-public-runtime-dom-mount] .button-collapse {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] [data-public-runtime-body-append-mount] {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] #preload {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] .flex-body {
  display: block;
  width: 100%;
}

${rootSelector} [data-public-runtime-dom-mount] #sheet {
  display: block;
  width: 100%;
  transform-origin: top left;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] {
  position: absolute !important;
  top: 16px !important;
  left: 50% !important;
  right: auto !important;
  bottom: auto !important;
  display: block !important;
  width: min(92%, 680px) !important;
  max-width: 680px !important;
  max-height: min(72vh, 450px) !important;
  height: auto !important;
  margin: 0 !important;
  opacity: 1 !important;
  overflow: hidden !important;
  transform: translateX(-50%) !important;
  z-index: 40 !important;
  border-radius: 18px !important;
  background: #fff8ed !important;
  box-shadow: 0 18px 42px rgba(70, 45, 24, 0.18) !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content {
  position: relative !important;
  inset: auto !important;
  height: auto !important;
  max-height: calc(min(72vh, 450px) - 64px) !important;
  padding: 22px 24px 18px !important;
  overflow: auto !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 12px 14px !important;
  width: 100% !important;
  height: auto !important;
  margin: 0 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .input-field {
  float: none !important;
  width: 100% !important;
  min-height: 68px !important;
  margin: 0 !important;
  padding: 0 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content label {
  display: block !important;
  position: static !important;
  max-height: none !important;
  margin-bottom: 6px !important;
  color: #6f5a42 !important;
  font-size: 0.72rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  transform: none !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content select.browser-default {
  display: block !important;
  height: 42px !important;
  margin: 0 !important;
  border: 1px solid rgba(120, 86, 48, 0.2) !important;
  border-radius: 9px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  color: #2d2118 !important;
  font-size: 0.96rem !important;
  font-weight: 750 !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer {
  position: relative !important;
  inset: auto !important;
  display: flex !important;
  justify-content: flex-end !important;
  align-items: center !important;
  gap: 10px !important;
  min-height: 58px !important;
  height: auto !important;
  padding: 10px 22px !important;
  border-top: 1px solid rgba(120, 86, 48, 0.12) !important;
  background: rgba(255, 248, 237, 0.96) !important;
}

${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer .btn-flat,
${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-footer a {
  height: 38px !important;
  line-height: 38px !important;
  margin: 0 !important;
  border-radius: 999px !important;
  font-weight: 900 !important;
  text-transform: none !important;
}

@media (max-width: 900px) {
  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 560px) {
  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] {
    width: calc(100% - 20px) !important;
  }

  ${rootSelector} [data-public-runtime-dom-mount] .modal[data-public-runtime-container-panel] .modal-content .row {
    grid-template-columns: 1fr !important;
  }
}
`
}
