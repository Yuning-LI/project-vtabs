import { buildPublicRuntimeHeightBridgeScript } from './height/publicRuntimeHeightBridge.ts'
import { buildPublicRuntimeMetronomeBridgeScript } from './metronome/publicRuntimeMetronomeBridge.ts'
import { buildPublicRuntimePlaybackBridgeScript } from './playback/publicRuntimePlaybackBridge.ts'
import { buildPublicRuntimeBootstrapScript } from './script/publicRuntimeBootstrap.ts'
import { buildPublicRuntimeSvgBridgeScript } from './svg/publicRuntimeSvgBridge.ts'

export type PublicRuntimeBridgeScriptStages = {
  runtimeFeatureScripts: string[]
  runtimeHostScripts: string[]
}

export function buildPublicRuntimeBridgeScriptStages(): PublicRuntimeBridgeScriptStages {
  return {
    runtimeFeatureScripts: [
      buildPublicRuntimeMetronomeBridgeScript(),
      buildPublicRuntimePlaybackBridgeScript(),
      buildPublicRuntimeSvgBridgeScript()
    ],
    runtimeHostScripts: [
      buildPublicRuntimeHeightBridgeScript(),
      buildPublicRuntimeBootstrapScript()
    ]
  }
}

export function joinPublicRuntimeBridgeScriptStages(
  stages: PublicRuntimeBridgeScriptStages
) {
  return `${stages.runtimeFeatureScripts.join('\n')}\n\n${stages.runtimeHostScripts.join('\n')}`
}
