import type { ReactNode } from 'react'
import ThemeToggle from '#/components/ThemeToggle'
import { DensityToggle } from './DensityToggle'

const NAV = [
  { href: '/markets', label: 'Markets' },
  { href: '/dashboard', label: 'Dashboard' },
]

/**
 * The app shell header (U9, R6, R7). Two-plane nav, the density toggle, and
 * slots the integration plan fills with the real connect button / network
 * status / account pill.
 */
export function AppHeader({
  networkStatus,
  account,
  connect,
}: {
  networkStatus?: ReactNode
  account?: ReactNode
  connect?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: 'linear-gradient(90deg,#56c6be,#7ed3bf)' }}
          />
          Paboxo
        </a>

        <div className="order-3 flex w-full items-center gap-4 text-sm font-semibold sm:order-none sm:w-auto">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DensityToggle />
          {networkStatus}
          {account ?? connect}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
