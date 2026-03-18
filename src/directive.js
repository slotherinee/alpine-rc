import { parseProps } from './props.js'
import { collectSlots, projectSlots } from './slots.js'
import { processStyles, applyScopeToAll, adoptGlobalStyles } from './styles.js'
import { loadFromTemplate, loadFromUrl } from './template.js'

function dispatch(el, name, detail = {}) {
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }))
}

function resolveSource(expression, evaluate) {
  if (!expression) return ''
  try {
    const val = evaluate(expression)
    if (val == null || val === false) return ''
    return String(val).trim()
  } catch (err) {
    console.error('[alpine-rc] Expression error:', err)
    return ''
  }
}

function unmount(el, Alpine, isIsolated, reactiveProps) {
  if (isIsolated) {
    if (el.shadowRoot) {
      Alpine.destroyTree(el.shadowRoot)
      el.shadowRoot.replaceChildren()
    }
  } else {
    for (const child of [...el.children]) Alpine.destroyTree(child)
    el.replaceChildren()
    // Remove only the scope we added, preserving parent scopes (e.g. x-for)
    if (el._x_dataStack) {
      el._x_dataStack = el._x_dataStack.filter((s) => s !== reactiveProps)
      if (el._x_dataStack.length === 0) delete el._x_dataStack
    }
  }
}

export default function registerDirective(Alpine) {
  Alpine.directive(
    'component',
    (el, { expression, modifiers }, { effect, cleanup, evaluate }) => {
      const isUrl = modifiers.includes('url')
      const isExternal = modifiers.includes('external')
      const isIsolated = modifiers.includes('isolated')
      const isScoped = modifiers.includes('scoped')

      let renderToken = 0
      let mounted = false
      let lastSource = null

      // Reactive props object — mutations propagate into the component automatically
      const reactiveProps = Alpine.reactive({})

      effect(() => {
        const source = resolveSource(expression, evaluate)
        const newProps = parseProps(el, evaluate)

        // Sync reactive props (Alpine reactivity in component picks up changes)
        for (const key of Object.keys(reactiveProps)) {
          if (!(key in newProps)) delete reactiveProps[key]
        }
        Object.assign(reactiveProps, newProps)

        // Skip re-render if only props changed
        if (mounted && source === lastSource) return
        lastSource = source

        if (!source) {
          if (mounted) unmount(el, Alpine, isIsolated, reactiveProps)
          mounted = false
          return
        }

        const token = ++renderToken

        ;(async () => {
          try {
            if (isUrl) dispatch(el, 'rc:loading', { source })

            const fragment = isUrl
              ? await loadFromUrl(source, { allowExternal: isExternal })
              : loadFromTemplate(source)

            if (token !== renderToken || !fragment) return

            const slots = collectSlots(el)
            const scopeAttr = processStyles(fragment, source, isScoped, isIsolated)

            projectSlots(fragment, slots)

            if (scopeAttr) applyScopeToAll(fragment, scopeAttr)

            if (mounted) unmount(el, Alpine, isIsolated, reactiveProps)

            if (isIsolated) {
              const shadow = el.shadowRoot || el.attachShadow({ mode: 'open' })

              if (modifiers.includes('with-styles')) adoptGlobalStyles(shadow)

              Alpine.addScopeToNode(shadow, reactiveProps, el)
              shadow.replaceChildren(fragment)
              Alpine.initTree(shadow)
            } else {
              Alpine.addScopeToNode(el, reactiveProps)
              el.replaceChildren(fragment)
              Alpine.initTree(el)
            }

            mounted = true
            dispatch(el, 'rc:loaded', { source })
          } catch (err) {
            console.error('[alpine-rc]', err)
            dispatch(el, 'rc:error', { source, error: err })
          }
        })()
      })

      cleanup(() => {
        renderToken++
        if (mounted) unmount(el, Alpine, isIsolated, reactiveProps)
      })
    },
  )
}
