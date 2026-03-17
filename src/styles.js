import { styleCache, setBounded } from './cache.js'

function hashString(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

function scopeSelector(selector, attr) {
  return selector
    .split(',')
    .map((s) => {
      const t = s.trim()
      if (!t || t === ':root' || t === 'html' || t === 'body') return t
      // Insert attr before pseudo-element if any (e.g. ::before)
      return t.replace(/(::[\w-]+)?$/, `[${attr}]$1`)
    })
    .join(', ')
}

function scopeRule(rule, attr) {
  // Style rule — scope selectors
  if (rule.selectorText !== undefined) {
    const selector = scopeSelector(rule.selectorText, attr)
    return `${selector} { ${rule.style.cssText} }`
  }

  // Grouping rule (@media, @supports, @layer, @container)
  if (rule.cssRules) {
    const prefix = rule.cssText.match(/^([^{]+)\{/)?.[1]?.trim() ?? ''
    const inner = Array.from(rule.cssRules)
      .map((r) => scopeRule(r, attr))
      .join('\n')
    return `${prefix} {\n${inner}\n}`
  }

  return rule.cssText
}

function buildScopedCss(cssText, attr) {
  const sheet = new CSSStyleSheet()
  try {
    sheet.replaceSync(cssText)
  } catch {
    return cssText
  }
  return Array.from(sheet.cssRules)
    .map((r) => scopeRule(r, attr))
    .join('\n')
}

function injectStyle(id, cssText) {
  if (document.getElementById(id)) return
  const el = document.createElement('style')
  el.id = id
  el.textContent = cssText
  document.head.appendChild(el)
}

/**
 * Extract <style> and <style scoped> from fragment.
 * Returns scope attribute name if scoped styles were processed, otherwise null.
 *
 * Modes:
 *   normal  — <style> injected to <head> once, <style scoped> treated as global
 *   scoped  — <style scoped> scoped via data attr and injected, <style> global
 *   isolated — styles stay in fragment (Shadow DOM handles isolation)
 */
export function processStyles(fragment, sourceId, isScoped, isIsolated) {
  const styleEls = [...fragment.querySelectorAll('style')]
  if (!styleEls.length) return null

  if (isIsolated) {
    // Remove 'scoped' attribute so it doesn't affect anything — shadow DOM isolates naturally
    for (const el of styleEls) el.removeAttribute('scoped')
    return null
  }

  let scopeAttr = null

  for (const el of styleEls) {
    const cssText = el.textContent.trim()
    const hasScoped = el.hasAttribute('scoped')
    el.remove()

    if (!cssText) continue

    if (hasScoped && isScoped) {
      // Build scoped attr once per component source
      const cacheKey = `scoped:${sourceId}`
      if (!styleCache.has(cacheKey)) {
        const attr = `data-arc-${hashString(sourceId)}`
        const scoped = buildScopedCss(cssText, attr)
        setBounded(styleCache, cacheKey, attr)
        injectStyle(`arc-scoped-${hashString(sourceId)}`, scoped)
      }
      scopeAttr = styleCache.get(cacheKey)
    } else {
      // Global — inject once
      const cacheKey = `global:${sourceId}:${hashString(cssText)}`
      if (!styleCache.has(cacheKey)) {
        setBounded(styleCache, cacheKey, true)
        injectStyle(`arc-global-${hashString(sourceId + cssText)}`, cssText)
      }
    }
  }

  return scopeAttr
}

export function applyScopeToAll(fragment, attr) {
  const walk = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) node.setAttribute(attr, '')
    for (const child of node.childNodes) walk(child)
  }
  for (const child of fragment.childNodes) walk(child)
}

// For .isolated mode — adopt global document stylesheets into shadow root
export function adoptGlobalStyles(shadowRoot) {
  const sheets = [...document.styleSheets]
    .filter((s) => {
      try {
        if (s.href) new URL(s.href, location.href) // throws if invalid
        return !s.href || new URL(s.href).origin === location.origin
      } catch {
        return false
      }
    })
    .map((s) => {
      try {
        const sheet = new CSSStyleSheet()
        const css = [...s.cssRules].map((r) => r.cssText).join('\n')
        sheet.replaceSync(css)
        return sheet
      } catch {
        return null
      }
    })
    .filter(Boolean)

  shadowRoot.adoptedStyleSheets = sheets
}
