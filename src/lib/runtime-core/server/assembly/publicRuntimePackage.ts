import {
  buildPublicRuntimeHtmlDocument,
  type PublicRuntimeDocumentInput
} from './publicRuntimeDocument.ts'
import {
  extractPublicRuntimeAssetManifest,
  type PublicRuntimeAsset,
  type PublicRuntimeInlineScript
} from './publicRuntimeAssetManifest.ts'
import type { RuntimeScriptEntry } from '../../runtimeScriptTypes.ts'

export type PublicRuntimePackage = {
  html: string
  bodyHtml: string
  styles: PublicRuntimeAsset[]
  scripts: PublicRuntimeAsset[]
  inlineScripts: PublicRuntimeInlineScript[]
  scriptEntries: RuntimeScriptEntry[]
  contextJson: string
}

export function buildPublicRuntimePackage(input: PublicRuntimeDocumentInput): PublicRuntimePackage {
  const html = buildPublicRuntimeHtmlDocument(input)
  const manifest = extractPublicRuntimeAssetManifest(html)

  return {
    html,
    bodyHtml: extractPublicRuntimeBodyHtml(html),
    styles: manifest.styles,
    scripts: manifest.scripts,
    inlineScripts: manifest.inlineScripts,
    scriptEntries: manifest.scriptEntries,
    contextJson: input.payloadJson
  }
}

function extractPublicRuntimeBodyHtml(html: string) {
  return html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
}
