import type { RuntimeScriptEntry } from '../runtimeScriptTypes'

export type RuntimeHtmlContainerPackage = {
  bodyHtml: string
  styles: Array<{
    src: string
  }>
  scriptEntries: RuntimeScriptEntry[]
}

export async function fetchRuntimeHtmlContainerPackage(
  url: string,
  options: {
    signal?: AbortSignal
  } = {}
): Promise<RuntimeHtmlContainerPackage> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      Accept: 'text/html'
    },
    signal: options.signal
  })

  if (!response.ok) {
    throw new Error(`Runtime package request failed: ${response.status}`)
  }

  return parseRuntimeHtmlContainerPackage(await response.text())
}

export function parseRuntimeHtmlContainerPackage(html: string): RuntimeHtmlContainerPackage {
  return {
    bodyHtml: extractRuntimeBodyHtml(html),
    styles: extractExternalStyles(html),
    scriptEntries: extractScriptEntries(html)
  }
}

function extractRuntimeBodyHtml(html: string) {
  return html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? ''
}

function extractExternalStyles(html: string) {
  const linkPattern = /<link\b[^>]*\bhref="([^"]+)"[^>]*>/gi
  const styles: RuntimeHtmlContainerPackage['styles'] = []

  for (const match of html.matchAll(linkPattern)) {
    const tagHtml = match[0]
    if (!/\brel="stylesheet"/i.test(tagHtml)) {
      continue
    }

    styles.push({
      src: match[1] ?? ''
    })
  }

  return styles
}

function extractScriptEntries(html: string): RuntimeScriptEntry[] {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  const srcPattern = /\bsrc="([^"]+)"/i
  const entries: RuntimeScriptEntry[] = []
  let order = 0

  for (const match of html.matchAll(scriptPattern)) {
    const tagHtml = match[0]
    const attributes = match[1] ?? ''
    const parsedAttributes = parseTagAttributes(attributes)
    const executable = isExecutableScriptType(parsedAttributes.type)
    const srcMatch = attributes.match(srcPattern)

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
