'use client'

import type { CSSProperties } from 'react'
import ContainerRuntimeHost from './ContainerRuntimeHost'
import type { PublicRuntimeContainerPackageData } from '@/lib/runtime-core/server/publicRuntimeContainerPackage'
import type { PublicRuntimeHostMode } from '@/lib/runtime-core/publicRuntimeHostMode'

type ExportRuntimeHostProps = {
  songId: string
  title: string
  mode: PublicRuntimeHostMode
  loadingId: string
  containerPackage?: PublicRuntimeContainerPackageData | null
  panelClassName?: string
  panelStyle?: CSSProperties
  overlayClassName?: string
  initialHeight?: number
}

export default function ExportRuntimeHost({
  songId,
  title,
  mode,
  loadingId,
  containerPackage,
  panelClassName,
  panelStyle,
  overlayClassName,
  initialHeight = 900
}: ExportRuntimeHostProps) {
  if (containerPackage) {
    return (
      <ContainerRuntimeHost
        key={`${songId}:${mode}:container`}
        songId={songId}
        title={title}
        bodyHtml={containerPackage.bodyHtml}
        styleAssets={containerPackage.styles}
        scriptEntries={containerPackage.scriptEntries}
        enableScriptLoader
        className={panelClassName}
        style={panelStyle}
        loadingId={loadingId}
        overlayClassName={overlayClassName}
        initialHeight={initialHeight}
        showScriptDiagnostics={false}
      />
    )
  }

  return (
    <div
      className={panelClassName}
      style={panelStyle}
      data-public-runtime-retired-host="true"
    >
      Runtime host package unavailable.
    </div>
  )
}
