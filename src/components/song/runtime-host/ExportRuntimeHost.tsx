'use client'

import type { CSSProperties } from 'react'
import PublicRuntimeFrame from '../PublicRuntimeFrame'
import ContainerRuntimeHost from './ContainerRuntimeHost'
import type { PublicRuntimeContainerPackageData } from '@/lib/runtime-core/server/publicRuntimeContainerPackage'
import type { PublicRuntimeHostMode } from '@/lib/runtime-core/publicRuntimeHostMode'

type ExportRuntimeHostProps = {
  songId: string
  title: string
  mode: PublicRuntimeHostMode
  frameSrc: string
  loadingId: string
  containerPackage?: PublicRuntimeContainerPackageData | null
  panelClassName?: string
  panelStyle?: CSSProperties
  iframeClassName?: string
  iframeStyle?: CSSProperties
  overlayClassName?: string
  initialHeight?: number
}

export default function ExportRuntimeHost({
  songId,
  title,
  mode,
  frameSrc,
  loadingId,
  containerPackage,
  panelClassName,
  panelStyle,
  iframeClassName,
  iframeStyle,
  overlayClassName,
  initialHeight = 900
}: ExportRuntimeHostProps) {
  const canUseContainer = mode === 'container' && Boolean(containerPackage)

  if (canUseContainer && containerPackage) {
    return (
      <ContainerRuntimeHost
        key={`${songId}:${frameSrc}:container`}
        songId={songId}
        title={title}
        bodyHtml={containerPackage.bodyHtml}
        styleAssets={containerPackage.styles}
        scriptEntries={containerPackage.scriptEntries}
        enableScriptLoader
        className={panelClassName}
        loadingId={loadingId}
        overlayClassName={overlayClassName}
        initialHeight={initialHeight}
        showScriptDiagnostics={false}
      />
    )
  }

  return (
    <PublicRuntimeFrame
      songId={songId}
      title={title}
      frameSrc={frameSrc}
      loadingId={loadingId}
      panelClassName={panelClassName}
      panelStyle={panelStyle}
      iframeClassName={iframeClassName}
      iframeStyle={iframeStyle}
      overlayClassName={overlayClassName}
      initialHeight={initialHeight}
    />
  )
}
