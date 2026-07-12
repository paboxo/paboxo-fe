import { definePlugin } from 'nitro'

/**
 * Server-side DOM shim, installed at Nitro startup.
 *
 * Reown AppKit ships Lit-based web components. Lit's `reactive-element` reads
 * the bare global `HTMLElement` (`class extends HTMLElement`) when its module is
 * *evaluated* — before any component renders. On the server there is no DOM, so
 * that evaluation throws `ReferenceError: HTMLElement is not defined` and 500s
 * every SSR response.
 *
 * A source-level `import './ssr-dom-shim'` cannot fix this: the bundler inlines
 * the shim into a chunk *body*, which ESM runs only after that chunk's imports
 * (Lit included) have already evaluated. A Nitro plugin, by contrast, runs once
 * at server startup — ahead of the first request's dynamic route import that
 * pulls in the AppKit/Lit chunks — so the globals are in place in time.
 *
 * We define only the custom-element primitives Lit touches, and deliberately
 * NOT `window` / `document`, so `typeof window === 'undefined'` SSR detection in
 * wagmi and the AppKit adapter still takes the server path. The wallet UI never
 * renders on the server (its components are mount-gated), so these stand-ins
 * only need to exist, not behave.
 */
export default definePlugin(() => {
  const g = globalThis as Record<string, unknown>

  if (typeof g.HTMLElement === 'undefined') {
    g.HTMLElement = class {}
  }

  if (typeof g.customElements === 'undefined') {
    g.customElements = {
      define() {},
      get() {
        return undefined
      },
      getName() {
        return null
      },
      upgrade() {},
      whenDefined() {
        return Promise.resolve()
      },
    }
  }
})
