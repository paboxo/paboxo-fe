import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import ThemeToggle from '#/components/ThemeToggle'
import { DensityToggle } from './DensityToggle'

const NAV = [
  {
    to: '/earn' as const,
    label: 'Earn',
    match: (p: string) => p.startsWith('/earn'),
  },
  {
    to: '/borrow' as const,
    label: 'Borrow',
    match: (p: string) => p.startsWith('/borrow'),
  },
  {
    to: '/swap' as const,
    label: 'Swap',
    match: (p: string) => p.startsWith('/swap'),
  },
  {
    to: '/portfolio' as const,
    label: 'Portfolio',
    match: (p: string) => p.startsWith('/portfolio'),
  },
]

/**
 * The app shell header (U9, R6, R7). Two-plane nav with an active indicator, and
 * slots the integration plan fills with the real connect button / network
 * status / account pill. The Simple/Pro density toggle lives in the page header.
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
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: 'linear-gradient(90deg,#38a8e0,#6cc6f0)' }}
          />
          Paboxo
        </Link>

        <div className="order-3 flex w-full items-center gap-4 text-sm font-semibold sm:order-none sm:w-auto">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={
                item.match(pathname) ? 'nav-link is-active' : 'nav-link'
              }
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Simple/Pro is a mobile-only choice — desktop always renders Pro. */}
          <span className="sm:hidden">
            <DensityToggle />
          </span>
          {networkStatus}
          {account ?? connect}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
