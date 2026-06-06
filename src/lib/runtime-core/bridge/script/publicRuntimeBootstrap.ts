import { buildPublicRuntimeLifecycleBootstrapScript } from './publicRuntimeLifecycleBootstrap.ts'
import { buildPublicRuntimeMessageBridgeScript } from './publicRuntimeMessageBridge.ts'

export function buildPublicRuntimeBootstrapScript() {
  return `${buildPublicRuntimeMessageBridgeScript()}${buildPublicRuntimeLifecycleBootstrapScript()}`
}
