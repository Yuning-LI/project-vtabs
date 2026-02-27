export function injectSpacing(abc: string, instrumentId: string): string {
  const FINGER_HEIGHT = 24
  const PADDING = 20
  const sysstaffsep = FINGER_HEIGHT + PADDING

  return `%%sysstaffsep ${sysstaffsep}\n%%spacing 2.0\n${abc}`
}
