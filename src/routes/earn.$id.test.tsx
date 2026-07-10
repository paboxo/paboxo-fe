import { Suspense, act } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { getAddress } from 'viem'
import type * as ReactRouter from '@tanstack/react-router'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { PoolResult } from '#/features/markets/hooks/usePools'
// `usePool` resolves to the mock below; importing the route module runs
// `createFileRoute` (mocked) at eval, capturing the lazy route component.
import { usePool } from '#/features/markets/hooks/usePools'
import '#/routes/earn.$id'

/**
 * Route-identity tests (U6, R30). The route delegates the pool address → view
 * resolution to `usePool`, so these drive `usePool`'s four discriminated states
 * and assert the route renders a distinguishable terminal state for each. The
 * matching logic itself (case-insensitive resolution, unavailable-vs-not-found)
 * is exercised against real data in `hooks/usePools.test.ts`.
 *
 * The `tanstackStart` plugin code-splits the route component, so `createFileRoute`
 * receives a lazy wrapper — the tests render it under `<Suspense>` and await it.
 */

// Stub the router so the route can be exercised without a RouterProvider:
// `createFileRoute` captures the (lazy) component and hands it a controllable
// param; the rest of the module is real (the plugin's transform needs it).
const params = vi.hoisted(() => ({ id: '' }))
const captured = vi.hoisted((): { Component: ComponentType } => ({
  Component: () => null,
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: () => (opts: { component: ComponentType }) => {
    captured.Component = opts.component
    return { useParams: () => params }
  },
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

// The pool hook — each test drives the discriminated result the route branches
// on (mocked the way EarnList.test mocks its list hook).
const pool = vi.hoisted((): { result: PoolResult } => ({
  result: { status: 'pending' },
}))
vi.mock('#/features/markets/hooks/usePools', () => ({
  usePool: vi.fn(() => pool.result),
}))

// Heavy children stubbed so the route test needs no wallet/query/chart
// providers — the route's own branching is what is under test.
vi.mock('#/features/markets/components/PoolInfo', () => ({
  PoolInfo: ({ market }: { market: { collateralSymbol: string } }) => (
    <div data-testid="pool-info">{market.collateralSymbol}</div>
  ),
}))
vi.mock('#/features/supply/components/SupplyLiquidityPanel', () => ({
  SupplyLiquidityPanel: () => <div data-testid="supply-panel" />,
}))
vi.mock('#/components/wallet/NetworkGuard', () => ({
  NetworkGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const KNOWN = MOCK_MARKETS[0]

function renderRoute() {
  const Page = captured.Component
  return render(
    <Suspense fallback={null}>
      <Page />
    </Suspense>,
  )
}

// The plugin code-splits the route component into a lazily-imported chunk whose
// first resolution is slow. Warm it once (properly awaited) so every test below
// renders against an already-resolved component and needs no long polling.
beforeAll(async () => {
  pool.result = { status: 'pending' }
  await act(async () => {
    render(
      <Suspense fallback={<span>warming</span>}>
        {(() => {
          const Page = captured.Component
          return <Page />
        })()}
      </Suspense>,
    )
  })
  await screen.findByRole('status', {}, { timeout: 15000 })
  cleanup()
}, 20000)

beforeEach(() => {
  params.id = ''
  pool.result = { status: 'pending' }
  vi.mocked(usePool).mockClear()
})

describe('earn/$id route', () => {
  it('renders the pool for a known address, forwarding a checksummed URL to usePool (case-insensitive)', async () => {
    const checksummed = getAddress(KNOWN.poolAddress)
    params.id = checksummed
    pool.result = { status: 'ready', market: KNOWN }

    renderRoute()

    // The pool renders, and the route forwarded the raw checksummed param to
    // `usePool`, which resolves it case-insensitively against the lowercased id.
    const info = await screen.findByTestId('pool-info')
    expect(info.textContent).toBe(KNOWN.collateralSymbol)
    expect(vi.mocked(usePool)).toHaveBeenCalledWith(checksummed)
    expect(checksummed).not.toBe(KNOWN.id) // the URL casing differs from the id
  })

  it('renders the unavailable state naming the reason for a validated-away pool', async () => {
    pool.result = { status: 'unavailable' }

    renderRoute()

    const note = await screen.findByRole('note')
    expect(note.textContent).toContain('Pool unavailable')
    // Names *why* it cannot be displayed — token data could not be verified.
    expect(note.textContent).toMatch(/token data/i)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders the not-found state for an address the indexer never returned, distinct from unavailable', async () => {
    pool.result = { status: 'not-found' }
    renderRoute()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Pool not found')
    // Distinguishable from unavailable by both role (alert vs note) and copy.
    expect(screen.queryByRole('note')).toBeNull()

    // The unavailable state differs by role and by copy.
    cleanup()
    pool.result = { status: 'unavailable' }
    renderRoute()
    const note = await screen.findByRole('note')
    expect(note.textContent).toContain('Pool unavailable')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('renders unavailable (not not-found) when the shared borrow token failed and every pool disappeared', async () => {
    // usePool maps the shared-token failure to `unavailable` for a real address.
    pool.result = { status: 'unavailable' }
    renderRoute()

    const note = await screen.findByRole('note')
    expect(note.textContent).toContain('Pool unavailable')
    expect(screen.queryByText('Pool not found')).toBeNull()
  })

  it('renders a loading state, not the not-found state, while the pool query is pending', async () => {
    pool.result = { status: 'pending' }
    renderRoute()

    const status = await screen.findAllByRole('status')
    expect(status.length).toBeGreaterThan(0)
    expect(screen.queryByText('Pool not found')).toBeNull()
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('builds its detail identity from MarketView.id, which is the lowercased pool address', () => {
    // The list row (owned by another agent) links to `/earn/${market.id}`; assert
    // the identity that link is built from is the lowercased pool address.
    expect(KNOWN.id).toBe(KNOWN.poolAddress.toLowerCase())
    expect(`/earn/${KNOWN.id}`).toBe(`/earn/${KNOWN.poolAddress.toLowerCase()}`)
  })
})
