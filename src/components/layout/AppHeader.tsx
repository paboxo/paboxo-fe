import type { ComponentType } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import ThemeToggle from '#/components/ThemeToggle'
import {
  BorrowIcon,
  EarnIcon,
  PortfolioIcon,
  SwapIcon,
} from '#/components/icons'
import type { IconProps } from '#/components/icons'
import { WalletControls } from '#/components/wallet/WalletControls'
import { DensityToggle } from './DensityToggle'

const NAV: Array<{
  to: '/earn' | '/borrow' | '/swap' | '/portfolio'
  label: string
  Icon: ComponentType<IconProps>
  match: (p: string) => boolean
}> = [
  {
    to: '/earn',
    label: 'Earn',
    Icon: EarnIcon,
    match: (p) => p.startsWith('/earn'),
  },
  {
    to: '/borrow',
    label: 'Borrow',
    Icon: BorrowIcon,
    match: (p) => p.startsWith('/borrow'),
  },
  {
    to: '/swap',
    label: 'Swap',
    Icon: SwapIcon,
    match: (p) => p.startsWith('/swap'),
  },
  {
    to: '/portfolio',
    label: 'Portfolio',
    Icon: PortfolioIcon,
    match: (p) => p.startsWith('/portfolio'),
  },
]

/**
 * The app shell header (U9, U11, R6, R7). Two-plane nav with an active
 * indicator and hand-drawn inline icons, and the wallet controls (one chain
 * chip + one account chip) rendered through RainbowKit. The Simple/Pro density
 * toggle lives in the page header.
 */
export function AppHeader() {
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
          {NAV.map(({ to, label, Icon, match }) => (
            <Link
              key={to}
              to={to}
              className={
                match(pathname)
                  ? 'nav-link is-active gap-1.5'
                  : 'nav-link gap-1.5'
              }
            >
              <Icon />
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Simple/Pro is a mobile-only choice — desktop always renders Pro. */}
          <span className="sm:hidden">
            <DensityToggle />
          </span>
          <WalletControls />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
