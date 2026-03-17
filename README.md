# alpine-rc

Alpine.js plugin for reusable HTML components. Global styles work out of the box — no config needed. Scoped styles and Shadow DOM isolation are opt-in.

## Installation

```bash
npm install alpine-rc
```

```js
import Alpine from 'alpinejs'
import alpineRc from 'alpine-rc'

Alpine.plugin(alpineRc)
Alpine.start()
```

### CDN

Load **before** Alpine:

```html
<script src="https://unpkg.com/alpine-rc/dist/alpine-rc.min.js" defer></script>
<script src="https://unpkg.com/alpinejs/dist/cdn.min.js" defer></script>
```

---

## Component files

A component is an `.html` file with a `<template>` wrapper:

```html
<!-- components/card.html -->
<template>
  <style scoped>
    .card { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
    .card h2 { margin: 0; }
  </style>

  <div class="card">
    <h2 x-text="title"></h2>
    <slot></slot>
  </div>
</template>
```

The `<template>` wrapper is stripped at load time. Styles are handled automatically — see [Styles](#styles).

---

## Basic usage

```html
<div x-component.url="'./components/card.html'" :title="post.title">
  <template x-slot>
    <p x-text="post.body"></p>
  </template>
</div>
```

### From an on-page template

```html
<template id="card">
  <div class="card">
    <h2 x-text="title"></h2>
    <slot></slot>
  </div>
</template>

<div x-component="'card'" :title="post.title"></div>
```

---

## Props

Pass data to the component via `:attr` or `x-bind:attr` bindings on the host element. Props are reactive — when the bound value changes, the component updates without re-rendering.

```html
<div
  x-component.url="'./components/card.html'"
  :title="post.title"
  :count="post.likes"
  :active="selectedId === post.id"
>
</div>
```

Inside the component template, props are available directly:

```html
<template>
  <div :class="{ active }">
    <h2 x-text="title"></h2>
    <span x-text="count"></span>
  </div>
</template>
```

The component also inherits the full Alpine scope of the host element, so parent data like `$store` is accessible too.

---

## Slots

### Default slot

```html
<div x-component.url="'./card.html'" :title="post.title">
  <template x-slot>
    <p>This goes into the default slot</p>
  </template>
</div>
```

```html
<!-- card.html -->
<template>
  <div class="card">
    <h2 x-text="title"></h2>
    <slot></slot>
  </div>
</template>
```

### Named slots

```html
<div x-component.url="'./card.html'" :title="post.title">
  <template x-slot>Main content</template>
  <template x-slot="footer">
    <button @click="save">Save</button>
  </template>
</div>
```

```html
<!-- card.html -->
<template>
  <div class="card">
    <h2 x-text="title"></h2>
    <slot></slot>
    <footer><slot name="footer"></slot></footer>
  </div>
</template>
```

Slots without matching content show their fallback children:

```html
<slot>This renders if no slot content is provided</slot>
```

---

## Styles

### Default — global styles work as-is

No configuration needed. Tailwind, CSS, SCSS, and any `<link>` stylesheets apply to the component naturally because it renders in the regular DOM.

`<style>` tags inside the component are extracted and injected into `<head>` once per component source.

```html
<!-- x-component.url="'./card.html'" (no modifier) -->
<template>
  <style>
    /* Injected into <head> once — global scope */
    .card { padding: 16px; }
  </style>
  <div class="card"></div>
</template>
```

### `.scoped` — isolated styles via data attribute

`<style scoped>` is transformed so selectors only match elements inside this component instance, using a `data-arc-*` attribute (similar to Vue SFC). Global styles and Tailwind still work.

```html
<div x-component.url.scoped="'./card.html'"></div>
```

```html
<!-- card.html -->
<template>
  <style scoped>
    /* Scoped: only applies inside this component */
    .card { padding: 16px; }
  </style>

  <style>
    /* Still global — injected to <head> as-is */
    .badge { border-radius: 99px; }
  </style>

  <div class="card">...</div>
</template>
```

The plugin generates a stable `data-arc-[hash]` attribute, adds it to every element in the template, and transforms the CSS selectors accordingly.

### `.isolated` — Shadow DOM

Full style encapsulation. Global CSS and Tailwind do **not** apply inside the component.

```html
<div x-component.url.isolated="'./card.html'"></div>
```

To adopt global stylesheets into the shadow root:

```html
<div x-component.url.isolated.with-styles="'./card.html'"></div>
```

---

## Modifiers reference

| Modifier | Description |
|---|---|
| `.url` | Load template from a same-origin URL |
| `.url.external` | Load template from a cross-origin URL |
| `.scoped` | Scope `<style scoped>` via data attribute |
| `.isolated` | Render in Shadow DOM |
| `.isolated.with-styles` | Shadow DOM + adopt global document stylesheets |

---

## Lifecycle events

All events bubble and are dispatched on the host element.

```js
el.addEventListener('rc:loading', ({ detail }) => console.log('loading', detail.source))
el.addEventListener('rc:loaded',  ({ detail }) => console.log('loaded',  detail.source))
el.addEventListener('rc:error',   ({ detail }) => console.log('error',   detail.error))
```

| Event | Fires when | Detail |
|---|---|---|
| `rc:loading` | URL fetch starts (`.url` only) | `{ source }` |
| `rc:loaded` | Component rendered | `{ source }` |
| `rc:error` | Expression, fetch, or render failed | `{ source, error }` |

---

## Cross-origin URLs

Same-origin by default. Use `.external` to allow cross-origin:

```html
<div x-component.url.external="'https://cdn.example.com/components/card.html'"></div>
```

---

## TypeScript

Types are included. No additional setup needed.

```ts
import type { RcLoadedEvent } from 'alpine-rc'

el.addEventListener('rc:loaded', (e: RcLoadedEvent) => {
  console.log(e.detail.source)
})
```

---

## Production: static HTML baking

At build time you can pre-render all components into static HTML using [vite-plugin-bake-alpine-components](https://www.npmjs.com/package/vite-plugin-bake-alpine-components).

```bash
npm i -D vite-plugin-bake-alpine-components
```

```js
// vite.config.js
import bakeAlpineComponents from 'vite-plugin-bake-alpine-components'

export default {
  plugins: [bakeAlpineComponents()]
}
```

The plugin evaluates `x-for`, `x-text`, and `x-component.url` at build time and outputs plain HTML with all data already inlined — no Alpine runtime needed for the initial render.
