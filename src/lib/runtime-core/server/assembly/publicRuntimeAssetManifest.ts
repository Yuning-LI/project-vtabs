import type { RuntimeScriptEntry } from '../../runtimeScriptTypes.ts'

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
  scriptEntries: RuntimeScriptEntry[]
}

export function extractPublicRuntimeAssetManifest(html: string): PublicRuntimeAssetManifest {
  return {
    styles: extractExternalStyles(html),
    scripts: extractExternalScripts(html),
    inlineScripts: extractInlineScripts(html),
    scriptEntries: extractScriptEntries(html)
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

function extractScriptEntries(html: string): RuntimeScriptEntry[] {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  const srcPattern = /\bsrc="([^"]+)"/i
  const entries: RuntimeScriptEntry[] = []
  let order = 0

  for (const match of html.matchAll(scriptPattern)) {
    const tagHtml = match[0]
    const attributes = match[1] ?? ''
    const srcMatch = attributes.match(srcPattern)
    const parsedAttributes = parseTagAttributes(attributes)
    const executable = isExecutableScriptType(parsedAttributes.type)

    if (srcMatch?.[1]) {
      entries.push({
        kind: 'script',
        mode: 'external',
        order,
        src: srcMatch[1],
        tagHtml,
        attributes: parsedAttributes,
        executable
      })
    } else {
      entries.push({
        mode: 'inline',
        order,
        tagHtml,
        content: match[2] ?? '',
        attributes: parsedAttributes,
        executable
      })
    }
    order += 1
  }

  return entries
}

function parseTagAttributes(rawAttributes: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const attributePattern = /([^\s=/"'>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

  for (const match of rawAttributes.matchAll(attributePattern)) {
    const name = match[1]?.toLowerCase()
    if (!name) {
      continue
    }
    attributes[name] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return attributes
}

function isExecutableScriptType(type: string | undefined) {
  if (!type) {
    return true
  }

  const normalized = type.trim().toLowerCase()
  return (
    normalized === 'text/javascript' ||
    normalized === 'application/javascript' ||
    normalized === 'application/ecmascript' ||
    normalized === 'text/ecmascript' ||
    normalized === 'module'
  )
}
