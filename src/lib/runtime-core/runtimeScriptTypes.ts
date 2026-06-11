export type RuntimeExternalScriptEntry = {
  kind: 'script'
  mode: 'external'
  order: number
  src: string
  tagHtml: string
  attributes: Record<string, string>
  executable: boolean
}

export type RuntimeInlineScriptEntry = {
  mode: 'inline'
  order: number
  tagHtml: string
  content: string
  attributes: Record<string, string>
  executable: boolean
}

export type RuntimeScriptEntry = RuntimeExternalScriptEntry | RuntimeInlineScriptEntry
