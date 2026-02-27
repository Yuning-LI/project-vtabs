export function injectSpacing(abc: string, instrumentId: string): string {
  const FINGER_HEIGHT = 24
  const PADDING = 20
  const sysstaffsep = FINGER_HEIGHT + PADDING

  let modified = `%%sysstaffsep ${sysstaffsep}\n%%spacing 2.0\n${abc}`
  const hasMultipleVoices = /^V:\s*\d/m.test(abc)
  if (hasMultipleVoices) {
    modified = `%%score (1)\n${modified}`
  }
  return modified
}
