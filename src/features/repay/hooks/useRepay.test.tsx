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

// The amount is always the debt to clear (borrow token, 6dp). Two paths.
describe('useRepay', () => {
  it('path A: approves the debt (+drift buffer) and pays from wallet, fee 0', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const repay = vi.spyOn(mockChainAdapter, 'repayWithSelectedToken')
    const totals = await mockChainAdapter.getMarketTotals(market.poolAddress)
    const debtAssets = 500_000_000n // 500 pxUSDT
    const shares = debtSharesForAssets(
      debtAssets,
      totals.totalBorrowAssets,
      totals.totalBorrowShares,
    )

    const { result } = renderHook(() => useRepay(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.repay(debtAssets)
    })

    // Approves the debt plus a 0.1% + 1 drift buffer (interest accrues pre-mine).
    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      debtAssets + debtAssets / 1000n + 1n,
    )
    expect(repay).toHaveBeenCalledWith(market.poolAddress, {
      user: USER,
      token: TOKENS.pxUSDT.address,
      shares,
      amountOutMinimum: 0n,
      fromPosition: false,
      fee: 0,
    })
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    repay.mockRestore()
  })

  it('path C: sells the collateral (fromPosition, no approval), fee 1000', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const repay = vi.spyOn(mockChainAdapter, 'repayWithSelectedToken')
    const totals = await mockChainAdapter.getMarketTotals(market.poolAddress)
    const debtAssets = 10_000_000n // 10 pxUSDT of debt
    const shares = debtSharesForAssets(
      debtAssets,
      totals.totalBorrowAssets,
      totals.totalBorrowShares,
    )

    const { result } = renderHook(() => useRepay(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.repay(debtAssets, true)
    })

    // Selling collateral needs no wallet approval.
    expect(approve).not.toHaveBeenCalled()
    expect(repay).toHaveBeenCalledWith(market.poolAddress, {
      user: USER,
      token: market.collateralAddress,
      shares,
      amountOutMinimum: 0n,
      fromPosition: true,
      fee: 1000,
    })
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    repay.mockRestore()
  })
})
