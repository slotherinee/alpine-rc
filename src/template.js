import { templateCache, remoteCache, setBounded } from './cache.js'

function toFragment(html) {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  return tpl.content
}

function stripOuterTemplate(html) {
  const m = html.match(/^\s*<template[^>]*>([\s\S]*)<\/template>\s*$/i)
  return m ? m[1].trim() : html.trim()
}

// Convert s-* build-time directives to their Alpine runtime equivalents so
// components work identically in dev mode (without the bake plugin).
//
//   s-text     → x-text       s-html  → x-html
//   s-class    → :class       s-style → :style
//   s-show     → x-show       s-bind:attr → :attr
//   <template s-for>  → <template x-for>
//   <template s-if>   → <template x-if>
//   s-if (on any element) → x-if
function convertServerDirectives(html) {
  return html
    .replace(/\bs-text=/g, 'x-text=')
    .replace(/\bs-html=/g, 'x-html=')
    .replace(/\bs-class=/g, ':class=')
    .replace(/\bs-style=/g, ':style=')
    .replace(/\bs-show=/g, 'x-show=')
    .replace(/\bs-bind:([a-zA-Z][a-zA-Z0-9-]*)=/g, ':$1=')
    .replace(/(<template\b[^>]*\s)s-for=/g, '$1x-for=')
    .replace(/(<template\b[^>]*\s)s-if=/g, '$1x-if=')
    .replace(/\bs-if=/g, 'x-if=')
}

function resolveUrl(url, allowExternal) {
  const normalized = (url ?? '').trim()
  if (!normalized) throw new Error('[alpine-rc] Empty URL')

  const resolved = new URL(normalized, location.href)

  if (!['http:', 'https:'].includes(resolved.protocol)) {
    throw new Error(`[alpine-rc] Unsupported protocol: ${resolved.protocol}`)
  }

  if (!allowExternal && resolved.origin !== location.origin) {
    throw new Error(`[alpine-rc] Cross-origin URL blocked: ${resolved.href}`)
  }

  return resolved.href
}

export function loadFromTemplate(id) {
  const key = (id ?? '').trim()
  if (!key) return null

  if (!templateCache.has(key)) {
    const el = document.getElementById(key)
    if (!el) {
      console.warn(`[alpine-rc] Template not found: "${key}"`)
      return null
    }
    setBounded(templateCache, key, convertServerDirectives(el.innerHTML))
  }

  return toFragment(templateCache.get(key)).cloneNode(true)
}

export async function loadFromUrl(url, { allowExternal = false } = {}) {
  const resolved = resolveUrl(url, allowExternal)

  if (!remoteCache.has(resolved)) {
    setBounded(
      remoteCache,
      resolved,
      fetch(resolved)
        .then((r) => {
          if (!r.ok) throw new Error(`[alpine-rc] Fetch failed (${r.status}): ${resolved}`)
          return r.text()
        })
        .then(stripOuterTemplate)
        .then(convertServerDirectives)
    )
  }

  try {
    const html = await remoteCache.get(resolved)
    return toFragment(html).cloneNode(true)
  } catch (err) {
    remoteCache.delete(resolved)
    throw err
  }
}
