export type PublicRuntimeAssetKind = 'style' | 'script'

export type PublicRuntimeAsset = {
  kind: PublicRuntimeAssetKind
  src: string
  tagHtml: string
}

export type PublicRuntimeInlineScript = {
  tagHtml: string
  content: string
}

export type PublicRuntimeAssetManifest = {
  styles: PublicRuntimeAsset[]
  scripts: PublicRuntimeAsset[]
  inlineScripts: PublicRuntimeInlineScript[]
}

export function extractPublicRuntimeAssetManifest(html: string): PublicRuntimeAssetManifest {
  return {
    styles: extractExternalStyles(html),
    scripts: extractExternalScripts(html),
    inlineScripts: extractInlineScripts(html)
  }
}

function extractExternalStyles(html: string): PublicRuntimeAsset[] {
  const linkPattern = /<link\b[^>]*\bhref="([^"]+)"[^>]*>/gi
  const styles: PublicRuntimeAsset[] = []

  for (const match of html.matchAll(linkPattern)) {
    const tagHtml = match[0]
    if (!/\brel="stylesheet"/i.test(tagHtml)) {
      continue
    }
    styles.push({
      kind: 'style',
      src: match[1] ?? '',
      tagHtml
    })
  }

  return styles
}

function extractExternalScripts(html: string): PublicRuntimeAsset[] {
  const scriptPattern = /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi
  const scripts: PublicRuntimeAsset[] = []

  for (const match of html.matchAll(scriptPattern)) {
    scripts.push({
      kind: 'script',
      src: match[1] ?? '',
      tagHtml: match[0]
    })
  }

  return scripts
}

function extractInlineScripts(html: string): PublicRuntimeInlineScript[] {
  const scriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  const scripts: PublicRuntimeInlineScript[] = []

  for (const match of html.matchAll(scriptPattern)) {
    scripts.push({
      tagHtml: match[0],
      content: match[1] ?? ''
    })
  }

  return scripts
}
