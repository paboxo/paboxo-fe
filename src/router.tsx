import { createRouter as createTanStackRouter } from '@tanstack/react-router'
// Empty type import only makes '@tanstack/react-start' resolvable for the SSR
// module augmentation below (no runtime import, no unused binding).
import type {} from '@tanstack/react-start'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

// SSR router registration. Kept here (not in the generated routeTree) because
// `tsr generate` does not emit it and would otherwise strip it on every run.
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
