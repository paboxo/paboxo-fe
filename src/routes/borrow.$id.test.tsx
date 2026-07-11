import { Suspense, act } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type * as ReactRouter from '@tanstack/react-router'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { PoolResult } from '#/features/markets/hooks/usePools'
import '#/routes/borrow.$id'

/**
 * Borrow route-identity + position-wiring tests. Like the Earn route test, the
 * pool address → view resolution is delegated to `usePool` (exercised for real
 * in `hooks/usePools.test.ts`), so these drive its states and assert the route
 * renders a distinguishable terminal state. Additionally they cover the
 * route-level half of AE3: the route derives `hasCollateral` from the position
 * and forwards it to `BorrowActions` (whose "Supply collateral first" gate is
 * tested in `BorrowActions.test`), and renders the "Your position" card.
 */

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
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}))

const pool = vi.hoisted((): { result: PoolResult } => ({
  result: { status: 'pending' },
}))
vi.mock('#/features/markets/hooks/usePools', () => ({
  usePool: vi.fn(() => pool.result),
}))

// The position hook drives `hasCollateral`; each test sets its data shape.
const position = vi.hoisted((): { data: unknown } => ({ data: undefined }))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(() => ({ data: position.data })),
}))

// Heavy children stubbed. BorrowActions echoes the `hasCollateral` prop the
// route computed so the route-level gate wiring (AE3) is assertable here.
vi.mock('#/features/markets/components/PoolInfo', () => ({
  PoolInfo: ({ market }: { market: { collateralSymbol: string } }) => (
    <div data-testid="pool-info">{market.collateralSymbol}</div>
  ),
}))
vi.mock('#/features/borrow/components/BorrowActions', () => ({
  BorrowActions: ({ hasCollateral }: { hasCollateral: boolean }) => (
    <div data-testid="borrow-actions" data-has-collateral={String(hasCollateral)} />
  ),
}))
vi.mock('#/components/ui/HealthMeter', () => ({
  HealthMeter: () => <div data-testid="health-meter" />,
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

// Warm the code-split route chunk once (properly awaited) so each test renders
// against an already-resolved component.
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
  position.data = undefined
})

describe('borrow/$id route', () => {
  it('renders a loading state while the pool query is pending', async () => {
    pool.result = { status: 'pending' }
    renderRoute()
    const status = await screen.findAllByRole('status')
    expect(status.length).toBeGreaterThan(0)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('renders the unavailable state naming the reason', async () => {
    pool.result = { status: 'unavailable' }
    renderRoute()
    const note = await screen.findByRole('note')
    expect(note.textContent).toContain('Pool unavailable')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('forwards hasCollateral=false to BorrowActions and shows a zeroed position (AE3)', async () => {
    pool.result = { status: 'ready', market: KNOWN }
    // A connected position with no collateral supply in this pool.
    position.data = { supplies: [], borrows: [], healthFactor: undefined }
    renderRoute()

    const actions = await screen.findByTestId('borrow-actions')
    // Route-level gate: no collateral -> the first-time-borrower path.
    expect(actions.getAttribute('data-has-collateral')).toBe('false')
    // The "Your position" card renders zeros for this pool.
    expect(screen.getByText('Your position')).toBeTruthy()
    expect(screen.getByText(`0 ${KNOWN.collateralSymbol}`)).toBeTruthy()
  })

  it('forwards hasCollateral=true when the position holds collateral in this pool', async () => {
    pool.result = { status: 'ready', market: KNOWN }
    position.data = {
      supplies: [
        {
          symbol: KNOWN.collateralSymbol,
          valueUsd: 100,
          balance: 1_000_000_000_000_000_000n,
          decimals: 18,
        },
      ],
      borrows: [],
      healthFactor: undefined,
    }
    renderRoute()

    const actions = await screen.findByTestId('borrow-actions')
    expect(actions.getAttribute('data-has-collateral')).toBe('true')
  })
})
