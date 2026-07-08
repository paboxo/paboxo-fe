import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import { debtSharesForAssets } from '#/lib/math'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useRepay } from './useRepay'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
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

// Covers R20 (mode A), R9: repay sizes debt shares from live totals.
describe('useRepay', () => {
  it('approves the exact assets and repays in mode A with live shares', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const repay = vi.spyOn(mockChainAdapter, 'repayWithSelectedToken')
    const totals = await mockChainAdapter.getMarketTotals(market.poolAddress)
    const assets = 500_000_000n // 500 pxUSDT
    const expectedShares = debtSharesForAssets(
      assets,
      totals.totalBorrowAssets,
      totals.totalBorrowShares,
    )

    const { result } = renderHook(() => useRepay(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.repay(assets)
    })

    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      assets,
    )
    expect(repay).toHaveBeenCalledWith(market.poolAddress, {
      user: USER,
      token: TOKENS.pxUSDT.address,
      shares: expectedShares,
      amountOutMinimum: 0n,
      fromPosition: false,
      fee: 0,
    })
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    repay.mockRestore()
  })
})
