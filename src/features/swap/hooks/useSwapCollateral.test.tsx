import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { TOKENS, getMarketConfig } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import {
  SWAP_FEE_TIER,
  estimateAmountOut,
  useSwapCollateral,
} from './useSwapCollateral'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const market = getMarketConfig('pxwhsk')! // pxWHSK collateral market

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

describe('estimateAmountOut', () => {
  it('prices the output from both feeds and rescales decimals', () => {
    // 1,000 pxWHSK @ $0.05 → 50 pxUSDT (6dp).
    const out = estimateAmountOut(
      1_000n * 10n ** 18n,
      5_000_000n, // $0.05 (8dp)
      100_000_000n, // $1 (8dp)
      18,
      6,
    )
    expect(out).toBe(50_000_000n)
  })
})

// Swap collateral within the position — trade pxWHSK → pxUSDT.
describe('useSwapCollateral', () => {
  it('derives a non-zero slippage floor and swaps with the DEX fee tier', async () => {
    const swapSpy = vi.spyOn(mockChainAdapter, 'swapCollateral')
    const { result } = renderHook(() => useSwapCollateral(market.pool), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.swap({
        pool: market.pool,
        tokenIn: market.collateralAddress,
        tokenInDecimals: 18,
        tokenOut: TOKENS.pxUSDT.address,
        tokenOutDecimals: 6,
        amountIn: 1_000n * 10n ** 18n,
        slippagePct: 0.5,
      })
    })

    expect(swapSpy).toHaveBeenCalledOnce()
    const [pool, params] = swapSpy.mock.calls[0]
    expect(pool).toBe(market.pool)
    expect(params.fee).toBe(SWAP_FEE_TIER)
    expect(params.tokenIn).toBe(market.collateralAddress)
    expect(params.tokenOut).toBe(TOKENS.pxUSDT.address)
    // 50 pxUSDT * (1 - 0.5%) = 49.75 pxUSDT — never 0.
    expect(params.amountOutMinimum).toBe(49_750_000n)
    expect(result.current.state).toBe('confirmed')
    swapSpy.mockRestore()
  })

  it('blocks a zero-amount swap before sending', async () => {
    const swapSpy = vi.spyOn(mockChainAdapter, 'swapCollateral')
    const { result } = renderHook(() => useSwapCollateral(market.pool), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.swap({
        pool: market.pool,
        tokenIn: market.collateralAddress,
        tokenInDecimals: 18,
        tokenOut: TOKENS.pxUSDT.address,
        tokenOutDecimals: 6,
        amountIn: 0n,
        slippagePct: 0.5,
      })
    })
    expect(swapSpy).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    swapSpy.mockRestore()
  })
})
