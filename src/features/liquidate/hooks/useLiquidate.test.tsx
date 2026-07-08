import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useLiquidate } from './useLiquidate'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const BORROWER = '0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A' as const
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

// Covers R22, R9; AE4.
describe('useLiquidate', () => {
  it('over-approves the live debt, seizes, then resets the approval (AE4)', async () => {
    const liquidatable = vi
      .spyOn(mockChainAdapter, 'checkLiquidatable')
      .mockResolvedValue({
        liquidatable: true,
        borrowValueUsd: 3_200n * 10n ** 18n,
        maxCollateralValueUsd: 3_000n * 10n ** 18n,
        bonusUsd: 0n,
      })
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const liquidation = vi.spyOn(mockChainAdapter, 'liquidation')

    const { result } = renderHook(() => useLiquidate(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.liquidate(BORROWER)
    })

    // First approve is the ~1% over-approval; final approve resets to 0.
    const overApprove = approve.mock.calls[0]
    expect(overApprove[0]).toBe(TOKENS.pxUSDT.address)
    expect(overApprove[1]).toBe(market.poolAddress)
    expect(overApprove[2]).toBeGreaterThan(0n)
    expect(liquidation).toHaveBeenCalledWith(market.poolAddress, [BORROWER])
    expect(approve).toHaveBeenLastCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      0n,
    )
    expect(result.current.state).toBe('confirmed')

    liquidatable.mockRestore()
    approve.mockRestore()
    liquidation.mockRestore()
  })

  it('blocks liquidation of a healthy borrower (never seizes)', async () => {
    const liquidatable = vi
      .spyOn(mockChainAdapter, 'checkLiquidatable')
      .mockResolvedValue({
        liquidatable: false,
        borrowValueUsd: 1_000n * 10n ** 18n,
        maxCollateralValueUsd: 5_000n * 10n ** 18n,
        bonusUsd: 0n,
      })
    const liquidation = vi.spyOn(mockChainAdapter, 'liquidation')

    const { result } = renderHook(() => useLiquidate(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.liquidate(BORROWER)
    })

    expect(liquidation).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/healthy/)

    liquidatable.mockRestore()
    liquidation.mockRestore()
  })
})
