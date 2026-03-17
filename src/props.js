const SKIP = new Set(['component', 'data', 'init', 'ignore', 'ref', 'bind', 'on', 'model', 'show', 'if', 'for', 'id', 'class', 'style'])

export function parseProps(el, evaluate) {
  const props = {}

  for (const attr of el.attributes) {
    let name = null

    if (attr.name.startsWith(':')) {
      name = attr.name.slice(1)
    } else if (attr.name.startsWith('x-bind:')) {
      name = attr.name.slice(7)
    }

    if (!name || SKIP.has(name) || name.startsWith('component')) continue

    try {
      props[name] = evaluate(attr.value)
    } catch {
      props[name] = attr.value
    }
  }

  return props
}
