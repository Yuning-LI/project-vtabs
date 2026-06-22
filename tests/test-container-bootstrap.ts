import {
  installPublicRuntimeContextLoadGuard,
  markPublicRuntimeContextStarted,
  shouldTriggerPublicRuntimeContextLoad
} from '../src/lib/runtime-core/client/containerBootstrap'

type RuntimeContextTestElement = {
  dataset: Record<string, string>
  querySelector: (selector: string) => RuntimeContextTestElement | null
}

function createElementWithSheet({
  hasRenderedSheet = false
}: {
  hasRenderedSheet?: boolean
} = {}): RuntimeContextTestElement {
  const renderedSheet: RuntimeContextTestElement = {
    dataset: {},
    querySelector: () => null
  }
  const sheet: RuntimeContextTestElement = {
    dataset: {},
    querySelector(selector) {
      return selector === 'svg, .sheet-svg' && hasRenderedSheet ? renderedSheet : null
    }
  }
  return {
    dataset: {},
    querySelector(selector) {
      return selector === '#sheet' ? sheet : null
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function run() {
  const unrenderedMount = createElementWithSheet()
  assert(
    shouldTriggerPublicRuntimeContextLoad(unrenderedMount as unknown as HTMLElement),
    'unrendered runtime mount should allow the first context load trigger'
  )

  markPublicRuntimeContextStarted(unrenderedMount as unknown as HTMLElement)
  assert(
    !shouldTriggerPublicRuntimeContextLoad(unrenderedMount as unknown as HTMLElement),
    'runtime mount should not trigger context load again after the session is marked started'
  )

  const renderedMount = createElementWithSheet({ hasRenderedSheet: true })
  assert(
    !shouldTriggerPublicRuntimeContextLoad(renderedMount as unknown as HTMLElement),
    'runtime mount should not trigger context load when the sheet is already rendered'
  )

  let originalTriggerCount = 0
  let callbackRunCount = 0
  const guardedMount = createElementWithSheet()
  const callbacks: Array<(context: { songId: string }) => void> = []
  const runtimeContext = {
    context: { songId: 'ode-to-joy' },
    callbacks,
    onLoad(callback: (context: { songId: string }) => void) {
      callbacks.push(callback)
      return this.context
    },
    triggerLoad() {
      originalTriggerCount += 1
      callbacks.forEach(callback => callback(this.context))
      return this.context
    }
  }
  const runtimeWindow = {
    Kit: {
      context: runtimeContext
    }
  }

  assert(
    installPublicRuntimeContextLoadGuard(
      guardedMount as unknown as HTMLElement,
      runtimeWindow as unknown as Window
    ),
    'runtime context guard should install when Kit.context is available'
  )
  runtimeWindow.Kit.context.triggerLoad()
  runtimeWindow.Kit.context.onLoad(() => {
    callbackRunCount += 1
  })
  runtimeWindow.Kit.context.triggerLoad()

  assert(originalTriggerCount === 1, 'guarded triggerLoad should call the original trigger once')
  assert(callbackRunCount === 1, 'late onLoad callback should run once after an early triggerLoad')
  assert(
    !shouldTriggerPublicRuntimeContextLoad(guardedMount as unknown as HTMLElement),
    'runtime mount should not request host fallback trigger after guarded triggerLoad'
  )

  console.log('✅ container bootstrap context load guard test passed')
}

run()
