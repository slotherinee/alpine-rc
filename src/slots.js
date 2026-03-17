export function collectSlots(el) {
  const slots = {}

  for (const tpl of el.querySelectorAll(':scope > template[x-slot]')) {
    const name = (tpl.getAttribute('x-slot') || 'default').trim() || 'default'
    slots[name] = tpl.content.cloneNode(true)
  }

  // Children that are not x-slot templates become the default slot
  if (!slots.default) {
    const nonSlot = [...el.childNodes].filter(
      (n) => !(n.nodeName === 'TEMPLATE' && n.hasAttribute('x-slot')),
    )
    if (nonSlot.length) {
      const frag = document.createDocumentFragment()
      nonSlot.forEach((n) => frag.appendChild(n.cloneNode(true)))
      slots.default = frag
    }
  }

  return slots
}

export function projectSlots(fragment, slots) {
  // Named slots: <slot name="footer"></slot>
  for (const slot of fragment.querySelectorAll('slot[name]')) {
    const name = slot.getAttribute('name')
    const content = slots[name]
    if (content) {
      slot.replaceWith(content.cloneNode(true))
    } else {
      slot.replaceWith(...slot.childNodes)
    }
  }

  // Default slot: <slot></slot> or <slot />
  for (const slot of fragment.querySelectorAll('slot:not([name])')) {
    const content = slots.default
    if (content) {
      slot.replaceWith(content.cloneNode(true))
    } else {
      slot.replaceWith(...slot.childNodes)
    }
  }
}
