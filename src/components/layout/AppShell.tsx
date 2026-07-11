import type { ReactNode } from 'react'
import Footer from '#/components/Footer'
import { AppHeader } from './AppHeader'

/**
 * The full-height app column: header, content, footer.
 *
 * This must sit *inside* the providers. A provider layer can render an
 * unstyled `<div>` between `<body>` and its children, so a flex column declared
 * on `<body>` never reaches the header/main/footer — the `flex-1` chain broke
 * there and the footer floated ~300px above the viewport bottom.
 *
 * `min-h-dvh` is viewport-relative, so it holds at any depth in the tree.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div data-app-shell="" className="app-frame flex flex-col">
      <AppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  )
}
