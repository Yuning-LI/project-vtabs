import type { PublicRuntimeVisualTheme } from '../runtimeTypes.ts'

export type PublicRuntimeVisualThemeName = 'classic' | 'off'

export const PUBLIC_RUNTIME_VISUAL_THEME_DISABLED: PublicRuntimeVisualTheme = {
  enabled: false,
  sheetTone: 'none',
  fingeringPalette: 'legacy',
  typography: 'legacy',
  fingeringShape: 'legacy'
}

export const PUBLIC_RUNTIME_VISUAL_THEME_CLASSIC: PublicRuntimeVisualTheme = {
  enabled: true,
  sheetTone: 'classic-paper',
  fingeringPalette: 'classic-public',
  typography: 'classic-public',
  fingeringShape: 'legacy'
}

export function resolvePublicRuntimeVisualTheme(input: {
  compareMode: boolean
  themeName?: string | null
  theme?: PublicRuntimeVisualTheme | null
}) {
  if (input.compareMode) {
    return PUBLIC_RUNTIME_VISUAL_THEME_DISABLED
  }

  if (input.themeName === 'off') {
    return PUBLIC_RUNTIME_VISUAL_THEME_DISABLED
  }

  if (input.themeName === 'classic') {
    return PUBLIC_RUNTIME_VISUAL_THEME_CLASSIC
  }

  return input.theme ?? PUBLIC_RUNTIME_VISUAL_THEME_CLASSIC
}

export function normalizePublicRuntimeVisualThemeName(value: string | null | undefined): PublicRuntimeVisualThemeName {
  return value === 'off' ? 'off' : 'classic'
}
