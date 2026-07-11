import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { formatUnits, parseUnits } from 'viem'
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
  it('approves assets plus a drift buffer and repays in mode A with live shares', async () => {
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

    // Approves a small buffer over `assets` (0.1% + 1) so interest accrued
    // before execution never leaves the allowance a few units short.
    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      assets + assets / 1000n + 1n,
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

  // Covers R5, AE3: swap paths carry fee 3000 + a non-zero slippage floor.
  async function expectedSwap(tokenAddress: `0x${string}`, decimals: number, assets: bigint) {
    const totals = await mockChainAdapter.getMarketTotals(market.poolAddress)
    const tokenPrice = (await mockChainAdapter.getPrice(tokenAddress)).price
    const borrowPrice = (await mockChainAdapter.getPrice(market.borrowAddress)).price
    const inputUsd =
      Number(formatUnits(assets, decimals)) *
      Number(formatUnits(tokenPrice, 8))
    const borrowTokens = inputUsd / Number(formatUnits(borrowPrice, 8))
    const borrowAmount = parseUnits(
      borrowTokens.toFixed(market.borrowDecimals),
      market.borrowDecimals,
    )
    return {
      shares: debtSharesForAssets(
        borrowAmount,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      ),
      amountOutMinimum: (borrowAmount * 9_950n) / 10_000n,
    }
  }

  it('repays from collateral via swap: no approval, fromPosition, fee 3000, min-out floor', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const repay = vi.spyOn(mockChainAdapter, 'repayWithSelectedToken')
    const assets = 1_000n * 10n ** 18n // 1000 pxWHSK
    const { shares, amountOutMinimum } = await expectedSwap(
      market.collateralAddress,
      market.collateralDecimals,
      assets,
    )

    const { result } = renderHook(() => useRepay(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.repay(assets, {
        address: market.collateralAddress,
        decimals: market.collateralDecimals,
        isCollateral: true,
      })
    })

    expect(approve).not.toHaveBeenCalled()
    expect(repay).toHaveBeenCalledWith(market.poolAddress, {
      user: USER,
      token: market.collateralAddress,
      shares,
      amountOutMinimum,
      fromPosition: true,
      fee: 3000,
    })
    expect(amountOutMinimum).toBeGreaterThan(0n)
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    repay.mockRestore()
  })

  it('repays with another wallet token (WETH): approves that token, fee 3000, min-out floor', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const repay = vi.spyOn(mockChainAdapter, 'repayWithSelectedToken')
    const weth = TOKENS.pxWETH
    const assets = 1n * 10n ** 18n // 1 WETH
    const { shares, amountOutMinimum } = await expectedSwap(
      weth.address,
      weth.decimals,
      assets,
    )

    const { result } = renderHook(() => useRepay(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.repay(assets, {
        address: weth.address,
        decimals: weth.decimals,
        isCollateral: false,
      })
    })

    expect(approve).toHaveBeenCalledWith(weth.address, market.poolAddress, assets)
    expect(repay).toHaveBeenCalledWith(market.poolAddress, {
      user: USER,
      token: weth.address,
      shares,
      amountOutMinimum,
      fromPosition: false,
      fee: 3000,
    })
    expect(amountOutMinimum).toBeGreaterThan(0n)
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    repay.mockRestore()
  })
})
