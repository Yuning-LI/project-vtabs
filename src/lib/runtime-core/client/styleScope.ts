const GLOBAL_SELECTOR_PATTERN = /(^|,)\s*(html|body|:root)(?=[\s,{.#[:>+~]|$)/gi

export function scopeRuntimeCss(cssText: string, rootSelector = '[data-public-runtime-root]') {
  return scopeCssRules(cssText, rootSelector)
}

function scopeCssRules(cssText: string, rootSelector: string): string {
  let output = ''
  let cursor = 0

  while (cursor < cssText.length) {
    const openIndex = cssText.indexOf('{', cursor)
    if (openIndex < 0) {
      output += cssText.slice(cursor)
      break
    }

    const selectorInput = splitSelectorComments(cssText.slice(cursor, openIndex))
    const selector = selectorInput.selector
    const closeIndex = findMatchingBrace(cssText, openIndex)
    if (closeIndex < 0) {
      output += cssText.slice(cursor)
      break
    }

    const body = cssText.slice(openIndex + 1, closeIndex)
    output += `${selectorInput.comments}${buildScopedRule(selector, body, rootSelector)}`
    cursor = closeIndex + 1
  }

  return output
}

function splitSelectorComments(rawSelector: string) {
  const comments = rawSelector.match(/\/\*[\s\S]*?\*\//g)?.join('\n') ?? ''
  return {
    comments: comments ? `${comments}\n` : '',
    selector: rawSelector.replace(/\/\*[\s\S]*?\*\//g, '').trim()
  }
}

function buildScopedRule(selector: string, body: string, rootSelector: string) {
  if (!selector) {
    return ''
  }

  if (selector.startsWith('@media') || selector.startsWith('@supports') || selector.startsWith('@layer')) {
    return `${selector}{${scopeCssRules(body, rootSelector)}}`
  }

  if (selector.startsWith('@keyframes') || selector.startsWith('@font-face') || selector.startsWith('@page')) {
    return `${selector}{${body}}`
  }

  if (selector.startsWith('@')) {
    return `${selector}{${body}}`
  }

  return `${scopeSelectorList(selector, rootSelector)}{${body}}`
}

function scopeSelectorList(selector: string, rootSelector: string) {
  return selector
    .split(',')
    .map(part => scopeSingleSelector(part.trim(), rootSelector))
    .filter(Boolean)
    .join(',')
}

function scopeSingleSelector(selector: string, rootSelector: string) {
  if (!selector || selector.startsWith(rootSelector)) {
    return selector
  }

  const normalized = selector.replace(GLOBAL_SELECTOR_PATTERN, (_match, prefix, globalName) => {
    return `${prefix}${rootSelector}${globalName === ':root' ? '' : ''}`
  })

  if (normalized.startsWith(rootSelector)) {
    return normalized
  }

  return `${rootSelector} ${selector}`
}

function findMatchingBrace(cssText: string, openIndex: number) {
  let depth = 0

  for (let index = openIndex; index < cssText.length; index += 1) {
    const char = cssText[index]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }

  return -1
}
