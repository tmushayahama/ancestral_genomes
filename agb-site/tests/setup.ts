import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

// `stubAgbApi` replaces global fetch; clear it so one spec's stub can't leak
// into the next.
afterEach(() => {
  vi.unstubAllGlobals()
})

// jsdom lacks window.matchMedia; MantineProvider's color-scheme logic calls it
// on mount. Stub it so component tests can render Mantine components.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom lacks ResizeObserver; Mantine and TanStack Virtual both use it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// jsdom lacks Element.prototype.scrollIntoView; the species tree calls it to
// bring the active node into view.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
