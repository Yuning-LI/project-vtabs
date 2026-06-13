export const RUNTIME_CONTENT_SELECTOR = 'canvas, img, text, tspan, use, path, line, rect, circle, ellipse'
export const RUNTIME_SHEET_SELECTOR = '#sheet, #sheet .sheet-svg'
export const RUNTIME_RENDERED_SHEET_SELECTOR = '#sheet svg, #sheet .sheet-svg'

export function hasRenderedRuntimeSheet(measuredRoot: HTMLElement) {
  return Boolean(measuredRoot.querySelector(RUNTIME_RENDERED_SHEET_SELECTOR))
}

export function hasRuntimeContentElementStarted(measuredRoot: HTMLElement) {
  const sheet = measuredRoot.querySelector('#sheet')
  if (!sheet) {
    return false
  }

  return Boolean(sheet.querySelector(RUNTIME_CONTENT_SELECTOR))
}

export function measureRuntimeContainerContentHeight(measuredRoot: HTMLElement) {
  const rootTop = measuredRoot.getBoundingClientRect().top
  let measuredBottom = 0

  measuredRoot.querySelectorAll(RUNTIME_SHEET_SELECTOR).forEach(node => {
    if (!('getBoundingClientRect' in node)) {
      return
    }
    const rect = node.getBoundingClientRect()
    if (rect.height <= 0) {
      return
    }
    measuredBottom = Math.max(measuredBottom, rect.bottom - rootTop, rect.height)
  })

  const mountElement = measuredRoot.querySelector<HTMLElement>(
    '[data-public-runtime-dom-mount="true"]'
  )
  const sheetElement = measuredRoot.querySelector<HTMLElement>('#sheet')
  const fallbackHeight = Math.max(
    mountElement?.scrollHeight ?? 0,
    mountElement?.offsetHeight ?? 0,
    sheetElement?.scrollHeight ?? 0,
    sheetElement?.offsetHeight ?? 0,
    measuredRoot.scrollHeight || 0
  )

  const nextHeight = measuredBottom > 0 ? measuredBottom : fallbackHeight
  return nextHeight > 0 ? Math.ceil(nextHeight + 1) : null
}
