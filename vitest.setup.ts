import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom has no matchMedia; polyfill it (matches:false = treat as mobile so the
// responsive density falls back to the stored preference in tests).
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- jsdom lacks matchMedia at runtime despite the DOM lib type
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// Unmount anything rendered by @testing-library between tests so the jsdom
// document does not leak state across cases.
afterEach(() => {
  cleanup()
})
