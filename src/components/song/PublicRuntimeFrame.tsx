'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import IframeRuntimeHost from './runtime-host/IframeRuntimeHost'
import type {
  PublicRuntimeHostController,
  RuntimeMaskRect,
  RuntimeTextHideRule
} from './runtime-host/types'

type PublicRuntimeFrameProps = {
  songId: string
  title: string
  frameSrc: string
  loadingId: string
  panelClassName?: string
  panelStyle?: CSSProperties
  iframeClassName?: string
  iframeStyle?: CSSProperties
  overlayClassName?: string
  initialHeight?: number
  fitHeight?: number
  fitTopPadding?: number
  fitCropTop?: number
  fitCropBottom?: number
  runtimeTextHideRules?: RuntimeTextHideRule[]
  runtimeMaskRects?: RuntimeMaskRect[]
  onHostControllerChange?: (controller: PublicRuntimeHostController | null) => void
  onFrameLoad?: () => void
}

/**
 * Public shell wrapper for the current iframe-backed runtime host.
 *
 * Keep this component free of iframe DOM access. Iframe-specific lifecycle,
 * document observation, and height synchronization belong in `IframeRuntimeHost`.
 */
export default function PublicRuntimeFrame({
  songId,
  title,
  frameSrc,
  loadingId,
  panelClassName,
  panelStyle,
  iframeClassName,
  iframeStyle,
  overlayClassName,
  initialHeight = 900,
  fitHeight,
  fitTopPadding = 0,
  fitCropTop = 0,
  fitCropBottom = 0,
  runtimeTextHideRules,
  runtimeMaskRects,
  onHostControllerChange,
  onFrameLoad
}: PublicRuntimeFrameProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <section
      className={
        panelClassName ??
        'page-warm-panel relative overflow-hidden'
      }
      style={panelStyle}
      data-public-runtime-host-mode="iframe"
    >
      <IframeRuntimeHost
        songId={songId}
        title={title}
        frameSrc={frameSrc}
        iframeClassName={iframeClassName}
        iframeStyle={iframeStyle}
        initialHeight={initialHeight}
        fitHeight={fitHeight}
        fitTopPadding={fitTopPadding}
        fitCropTop={fitCropTop}
        fitCropBottom={fitCropBottom}
        runtimeTextHideRules={runtimeTextHideRules}
        runtimeMaskRects={runtimeMaskRects}
        onHostControllerChange={onHostControllerChange}
        onFrameLoad={onFrameLoad}
        onLoadingChange={setIsLoading}
      />
      {isLoading ? (
        <div
          id={loadingId}
          data-runtime-loading="true"
          className={
            overlayClassName
              ? `pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center ${overlayClassName}`
              : 'pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center'
          }
        >
          <div className="runtime-loading-card" role="status" aria-live="polite">
            <div className="runtime-loading-notes" aria-hidden="true">
              <span>🎶</span>
              <span>♪</span>
              <span>♫</span>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-stone-800">
              Loading sheet...
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              The fingering chart is opening.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
