import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useSupplyLiquidity } from './useSupplyLiquidity'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const OTHER = '0x9999999999999999999999999999999999999999' as const
const market = MOCK_MARKETS[0]

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

// Covers R17: supply liquidity with exact approval, on-behalf, and mint-guard.
describe('useSupplyLiquidity', () => {
  it('approves the pool for the exact amount then supplies and confirms', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const supplyLiquidity = vi.spyOn(mockChainAdapter, 'supplyLiquidity')
    const { result } = renderHook(() => useSupplyLiquidity(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.supply(1_000_000n)
    })
    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      1_000_000n,
    )
    expect(supplyLiquidity).toHaveBeenCalledWith(
      market.poolAddress,
      USER,
      1_000_000n,
    )
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    supplyLiquidity.mockRestore()
  })

  it('credits the on-behalf address when one is passed', async () => {
    const supplyLiquidity = vi.spyOn(mockChainAdapter, 'supplyLiquidity')
    const { result } = renderHook(() => useSupplyLiquidity(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.supply(1_000_000n, OTHER)
    })
    expect(supplyLiquidity).toHaveBeenCalledWith(
      market.poolAddress,
      OTHER,
      1_000_000n,
    )
    supplyLiquidity.mockRestore()
  })

  it('rejects a supply too small to mint a share (never sends)', async () => {
    // A pool with far scarcer shares than assets → 1 unit rounds to 0 shares.
    const totals = vi
      .spyOn(mockChainAdapter, 'getMarketTotals')
      .mockResolvedValue({
        totalSupplyAssets: 1_000_000_000000n,
        totalBorrowAssets: 0n,
        totalBorrowShares: 0n,
        totalSupplyShares: 1n,
      })
    const supplyLiquidity = vi.spyOn(mockChainAdapter, 'supplyLiquidity')
    const { result } = renderHook(() => useSupplyLiquidity(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.supply(1n)
    })
    expect(supplyLiquidity).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/mint a share/)
    totals.mockRestore()
    supplyLiquidity.mockRestore()
  })
})
