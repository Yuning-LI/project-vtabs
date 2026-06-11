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

${rootSelector} [data-public-runtime-dom-mount="true"] #header,
${rootSelector} [data-public-runtime-dom-mount="true"] .head-bar {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount="true"] #preload {
  display: none !important;
}

${rootSelector} [data-public-runtime-dom-mount="true"] .flex-body {
  display: block;
  width: 100%;
}

${rootSelector} [data-public-runtime-dom-mount="true"] #sheet {
  display: block;
  width: 100%;
  transform-origin: top left;
}
`
}
