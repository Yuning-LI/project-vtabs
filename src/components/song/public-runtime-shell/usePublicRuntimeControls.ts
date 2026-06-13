export function normalizeExplicitShowGraph(
  value: string | null | undefined,
  graphOptions: string[]
) {
  if (!value) {
    return null
  }

  if (value === 'off') {
    return value
  }

  if (value === 'on') {
    return graphOptions[0] ?? null
  }

  return graphOptions.includes(value) ? value : null
}
