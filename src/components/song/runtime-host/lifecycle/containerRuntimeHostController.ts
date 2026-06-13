import type { PublicRuntimeHostController } from '../types'
import { dispatchContainerRuntimeCommand } from '../containerRuntimeTransport'

export function createContainerRuntimeHostController(
  root: HTMLElement
): PublicRuntimeHostController {
  return {
    hostElement: root,
    containsEventTarget(target) {
      return target instanceof Node && root.contains(target)
    },
    destroy() {
      /**
       * React owns the host wrapper. Runtime DOM teardown is handled by the
       * container lifecycle hook and script bootstrap disposer.
       */
    },
    postMessage(message) {
      return dispatchContainerRuntimeCommand(message)
    }
  }
}
