'use client'

import { useEffect, useState } from 'react'
import { scopeRuntimeCss } from '@/lib/runtime-core/client/styleScope'
import type { RuntimeStyleAsset } from '../RuntimeStyleInjector'

export function useScopedRuntimeCss({
  assets,
  rootSelector
}: {
  assets: RuntimeStyleAsset[]
  rootSelector: string
}) {
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

  return scopedCss
}
