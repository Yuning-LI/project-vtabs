import {
  buildPublicRuntimeHtmlDocument,
  type PublicRuntimeDocumentInput
} from './publicRuntimeDocument.ts'
import {
  extractPublicRuntimeAssetManifest,
  type PublicRuntimeAsset,
  type PublicRuntimeInlineScript
} from './publicRuntimeAssetManifest.ts'

export type PublicRuntimePackage = {
  html: string
  styles: PublicRuntimeAsset[]
  scripts: PublicRuntimeAsset[]
  inlineScripts: PublicRuntimeInlineScript[]
  contextJson: string
}

export function buildPublicRuntimePackage(input: PublicRuntimeDocumentInput): PublicRuntimePackage {
  const html = buildPublicRuntimeHtmlDocument(input)
  const manifest = extractPublicRuntimeAssetManifest(html)

  return {
    html,
    styles: manifest.styles,
    scripts: manifest.scripts,
    inlineScripts: manifest.inlineScripts,
    contextJson: input.payloadJson
  }
}
