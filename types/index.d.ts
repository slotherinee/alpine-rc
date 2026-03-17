import type { Alpine } from 'alpinejs'

// ─── Plugin ──────────────────────────────────────────────────────────────────

/**
 * Alpine RC plugin. Register with `Alpine.plugin(alpineRc)`.
 *
 * @example
 * import Alpine from 'alpinejs'
 * import alpineRc from 'alpine-rc'
 *
 * Alpine.plugin(alpineRc)
 * Alpine.start()
 */
declare function alpineRc(Alpine: Alpine): void

export default alpineRc

// ─── Directive modifiers ──────────────────────────────────────────────────────

/**
 * `x-component` directive modifiers.
 *
 * - (none)          — render inline, global styles work (Tailwind, CSS, SCSS)
 * - `url`           — load template from a same-origin URL
 * - `url.external`  — load template from a cross-origin URL
 * - `scoped`        — scope `<style scoped>` via data attribute (no Shadow DOM)
 * - `isolated`      — render in Shadow DOM (full style isolation)
 * - `isolated.with-styles` — Shadow DOM + adopt global document stylesheets
 */
export type ComponentModifier =
  | 'url'
  | 'external'
  | 'scoped'
  | 'isolated'
  | 'with-styles'

// ─── Lifecycle events ─────────────────────────────────────────────────────────

export interface RcLoadingDetail {
  source: string
}

export interface RcLoadedDetail {
  source: string
}

export interface RcErrorDetail {
  source: string
  error: Error
}

/**
 * Dispatched on the host element when a URL component starts fetching.
 * Only fires with the `.url` modifier.
 */
export type RcLoadingEvent = CustomEvent<RcLoadingDetail>

/**
 * Dispatched on the host element after the component is fully rendered.
 */
export type RcLoadedEvent = CustomEvent<RcLoadedDetail>

/**
 * Dispatched on the host element when rendering fails.
 */
export type RcErrorEvent = CustomEvent<RcErrorDetail>

// ─── Alpine augmentation ──────────────────────────────────────────────────────

declare module 'alpinejs' {
  interface XAttributes {
    /**
     * Renders a component into the host element.
     *
     * **From on-page template:**
     * ```html
     * <div x-component="'card'"></div>
     * ```
     *
     * **From URL (same-origin by default):**
     * ```html
     * <div x-component.url="'./components/card.html'"></div>
     * ```
     *
     * **With scoped styles:**
     * ```html
     * <div x-component.url.scoped="'./components/card.html'"></div>
     * ```
     *
     * **With Shadow DOM isolation:**
     * ```html
     * <div x-component.url.isolated="'./components/card.html'"></div>
     * ```
     *
     * **Pass props via `:attr` bindings:**
     * ```html
     * <div x-component.url="'./card.html'" :title="post.title" :count="likes"></div>
     * ```
     */
    'x-component': string
    'x-component.url': string
    'x-component.url.external': string
    'x-component.url.scoped': string
    'x-component.url.isolated': string
    'x-component.url.isolated.with-styles': string
  }
}

// ─── Component file format ────────────────────────────────────────────────────

/**
 * A component file (`*.html`) can be structured as:
 *
 * ```html
 * <template>
 *   <!-- Global style — injected into <head> once -->
 *   <style>
 *     .card { border: 1px solid #ddd; }
 *   </style>
 *
 *   <!-- Scoped style — only active when host uses .scoped modifier -->
 *   <style scoped>
 *     .card { padding: 16px; }
 *   </style>
 *
 *   <div class="card">
 *     <h2 x-text="title"></h2>
 *     <slot></slot>
 *     <slot name="footer"></slot>
 *   </div>
 * </template>
 * ```
 *
 * Props declared via `:attr` on the host element are available
 * as reactive data inside the component template.
 */
export type ComponentFile = never
