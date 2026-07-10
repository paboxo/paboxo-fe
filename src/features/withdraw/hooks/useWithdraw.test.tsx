import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { supplySharesForAssets } from '#/lib/math'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useWithdraw } from './useWithdraw'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const market = MOCK_MARKETS[0] // pxwhsk: $8,000 collateral, ~$3,172 debt

beforeEach(() => {
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useSwitchChain>)
})

// Covers R21: withdraw re-checks health and routes funds to the owner.
describe('useWithdraw', () => {
  it('withdraws a small amount of collateral to the owner', async () => {
    const withdraw = vi.spyOn(mockChainAdapter, 'withdrawCollateral')
    const { result } = renderHook(() => useWithdraw(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.withdrawCollateral(1_000n * 10n ** 18n) // 1,000 pxWHSK ≈ $50
    })
    expect(withdraw).toHaveBeenCalledWith(
      market.poolAddress,
      1_000n * 10n ** 18n,
      USER,
    )
    expect(result.current.state).toBe('confirmed')
    withdraw.mockRestore()
  })

  it('blocks a withdrawal that would make the position unhealthy', async () => {
    const withdraw = vi.spyOn(mockChainAdapter, 'withdrawCollateral')
    const { result } = renderHook(() => useWithdraw(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      // 100,000 pxWHSK ≈ $5,000 of the $8,000 collateral → power drops below debt.
      await result.current.withdrawCollateral(100_000n * 10n ** 18n)
    })
    expect(withdraw).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/unhealthy/)
    withdraw.mockRestore()
  })

  // Covers R3: liquidity withdraw is denominated in SHARES on-chain — the hook
  // converts the entered asset amount, not passing it through raw.
  it('converts the entered asset amount to supply shares before redeeming', async () => {
    const withdrawLiq = vi.spyOn(mockChainAdapter, 'withdrawLiquidity')
    const totals = await mockChainAdapter.getMarketTotals(market.poolAddress)
    const assets = 100_000_000n // 100 pxUSDT (6dp)
    const expectedShares = supplySharesForAssets(
      assets,
      totals.totalSupplyAssets,
      totals.totalSupplyShares,
    )

    const { result } = renderHook(() => useWithdraw(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.withdrawLiquidity(assets)
    })

    expect(withdrawLiq).toHaveBeenCalledWith(
      market.poolAddress,
      expectedShares,
      USER,
    )
    expect(result.current.state).toBe('confirmed')
    withdrawLiq.mockRestore()
  })
})
