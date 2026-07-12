import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { HASHKEY } from '#/lib/contracts'
import { AppHeader } from './AppHeader'

// The header reads the active path and renders typed <Link>s; stub the router
// so the nav can be asserted without a full RouterProvider (the repo keeps
// route files thin and untested, so there is no router test harness).
const nav = vi.hoisted(() => ({ pathname: '/earn' }))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({
    select,
  }: {
    select: (s: { location: { pathname: string } }) => unknown
  }) => select({ location: { pathname: nav.pathname } }),
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// WalletControls renders through Reown AppKit's hooks. Stub them so the header
// can be exercised without a live wallet: each test sets `wallet`, which the
// mocked hooks return.
const wallet = vi.hoisted(() => ({
  address: undefined as string | undefined,
  isConnected: false,
  chainId: undefined as number | undefined,
}))

vi.mock('@reown/appkit/react', () => ({
  useAppKit: () => ({ open: () => {} }),
  useAppKitAccount: () => ({
    address: wallet.address,
    isConnected: wallet.isConnected,
  }),
  useAppKitNetwork: () => ({
    chainId: wallet.chainId,
    caipNetwork: { name: 'HashKey' },
  }),
}))

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca'

function connectHashkey() {
  wallet.address = ADDRESS
  wallet.isConnected = true
  wallet.chainId = HASHKEY.id
}

function connectWrongNetwork() {
  wallet.address = ADDRESS
  wallet.isConnected = true
  wallet.chainId = 1
}

function disconnect() {
  wallet.address = undefined
  wallet.isConnected = false
  wallet.chainId = undefined
}

function renderHeader(pathname: string) {
  nav.pathname = pathname
  return render(
    <DensityProvider>
      <AppHeader />
    </DensityProvider>,
  )
}

beforeEach(() => {
  connectHashkey()
})

// Covers R1.
describe('AppHeader nav', () => {
  it('renders exactly Earn / Borrow / Swap / Portfolio and drops Markets/Dashboard', () => {
    renderHeader('/earn')
    expect(screen.getByRole('link', { name: 'Earn' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Borrow' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Swap' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Portfolio' })).toBeTruthy()
    // The removed intent-first surfaces are gone from the nav.
    expect(screen.queryByRole('link', { name: 'Markets' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  })

  it('marks the active plane from the current path, including per-pool pages', () => {
    renderHeader('/borrow/pxwhsk')
    expect(screen.getByRole('link', { name: 'Borrow' }).className).toContain(
      'is-active',
    )
    expect(screen.getByRole('link', { name: 'Earn' }).className).not.toContain(
      'is-active',
    )
    expect(screen.getByRole('link', { name: 'Swap' }).className).not.toContain(
      'is-active',
    )
    expect(
      screen.getByRole('link', { name: 'Portfolio' }).className,
    ).not.toContain('is-active')
  })

  // Each nav icon is decorative — the link's accessible name comes from its
  // text label, and querying by that name resolves the link.
  it('gives each nav item a text accessible name with a decorative icon', () => {
    renderHeader('/earn')
    const earn = screen.getByRole('link', { name: 'Earn' })
    const svg = earn.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})

// Covers U11: one chain indicator, danger state, responsive collapse, matched
// heights.
describe('AppHeader wallet controls', () => {
  const CHIP =
    'items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)]'

  function chainControl(container: HTMLElement) {
    return container.querySelector('[data-chain-chip]')
  }

  /** The polite region that announces a wrong network; empty when supported. */
  function liveRegion(container: HTMLElement) {
    return container.querySelector('[role="status"]')
  }

  function addressControl(container: HTMLElement) {
    // The account chip is the only chip carrying the truncated-address `.num`.
    return container.querySelector('.num')?.closest('button') ?? null
  }

  it('shows the chain name once (wallet chip) when connected to HashKey', () => {
    connectHashkey()
    renderHeader('/earn')
    // Only the wallet chain chip shows the chain — the always-on NetworkPill was
    // removed so the chain is no longer duplicated.
    expect(screen.getAllByText(new RegExp(HASHKEY.name, 'i'))).toHaveLength(1)
  })

  it('shows a danger-toned wrong-network indication off HashKey', () => {
    connectWrongNetwork()
    const { container } = renderHeader('/earn')
    const control = chainControl(container)
    expect(control?.textContent).toContain('Wrong network')
    const dot = control?.querySelector(
      'span[aria-hidden="true"]',
    ) as HTMLElement
    expect(dot.style.background).toContain('--danger')
    // The announcement lives in the live region, not on the button.
    expect(liveRegion(container)?.textContent).toBe('Wrong network')
  })

  it('keeps the chain chip a button and leaves the live region silent on HashKey', () => {
    connectHashkey()
    const { container } = renderHeader('/earn')
    expect(chainControl(container)?.tagName).toBe('BUTTON')
    expect(chainControl(container)?.getAttribute('role')).toBeNull()
    expect(liveRegion(container)?.textContent).toBe('')
  })

  it('renders neither the chain nor the address control when disconnected, only connect', () => {
    disconnect()
    const { container } = renderHeader('/earn')
    expect(chainControl(container)).toBeNull()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeTruthy()
    // No chain is shown at all when disconnected (NetworkPill removed).
    expect(screen.queryByText(new RegExp(HASHKEY.name, 'i'))).toBeNull()
  })

  it('collapses only the chain control below sm, never the address control', () => {
    connectHashkey()
    const { container } = renderHeader('/earn')
    const chain = chainControl(container)
    expect(chain?.className).toContain('hidden')
    expect(chain?.className).toContain('sm:inline-flex')
    const address = addressControl(container)
    expect(address?.className).not.toContain('hidden')
  })

  it('sizes the chain and address controls from the same chip contract', () => {
    connectHashkey()
    const { container } = renderHeader('/earn')
    expect(chainControl(container)?.className).toContain(CHIP)
    expect(addressControl(container)?.className).toContain(CHIP)
  })
})
