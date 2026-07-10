import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { MARKETS } from '#/lib/contracts'
import { useMarketPosition } from './usePosition'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const USER = '0x1111111111111111111111111111111111111111' as const

function setConnected(isConnected: boolean) {
  mockUseAccount.mockReturnValue({
    address: isConnected ? USER : undefined,
    isConnected,
  } as unknown as ReturnType<typeof useAccount>)
}

beforeEach(() => setConnected(true))

// Covers R5, R7, R9.
describe('useMarketPosition', () => {
  it('resolves by the pool address, which is what MarketView.id now holds', async () => {
    // Production passes `market.id` — a lowercased pool address since the pool
    // list became indexer-sourced. Every test here used to pass a slug, so the
    // suite stayed green while the Withdraw tab silently capped at zero.
    const { result } = renderHook(
      () => useMarketPosition(MARKETS[0].pool.toLowerCase()),
      { wrapper: QueryWrapper },
    )
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(
      result.current.data?.supplies.some((r) => r.symbol === 'pxUSDT'),
    ).toBe(true)
  })

  it('resolves a checksummed pool address too', async () => {
    const { result } = renderHook(() => useMarketPosition(MARKETS[0].pool), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data).not.toBeNull()
  })

  it("returns one pool's supplied balance, collateral, debt, and health for a known id", async () => {
    const { result } = renderHook(() => useMarketPosition('pxwhsk'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    const position = result.current.data
    expect(position).not.toBeNull()
    // Lender liquidity (pxUSDT) + borrower collateral (pxWHSK) for this pool.
    expect(position?.supplies.some((row) => row.symbol === 'pxUSDT')).toBe(true)
    expect(position?.supplies.some((row) => row.symbol === 'pxWHSK')).toBe(true)
    // pxUSDT debt is present.
    expect(position?.borrows.some((row) => row.symbol === 'pxUSDT')).toBe(true)
    // Single-pool health (~1.89), not the cross-pool aggregate Math.min → 99.
    expect(position?.healthFactor).toBeGreaterThan(1)
    expect(position?.healthFactor).toBeLessThan(3)
  })

  it('returns an empty/zero position for a pool the user has nothing in', async () => {
    const { result } = renderHook(() => useMarketPosition('pxwbtc'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).not.toBeNull()
    expect(result.current.data?.supplies).toEqual([])
    expect(result.current.data?.borrows).toEqual([])
    expect(result.current.data?.healthFactor).toBeUndefined()
  })

  it('resolves to null (never crashes) for an unknown id', () => {
    const { result } = renderHook(() => useMarketPosition('does-not-exist'), {
      wrapper: QueryWrapper,
    })
    // Unknown id → query disabled, no throw.
    expect(result.current.data).toBeNull()
  })

  it('is disabled until a wallet is connected', () => {
    setConnected(false)
    const { result } = renderHook(() => useMarketPosition('pxwhsk'), {
      wrapper: QueryWrapper,
    })
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
