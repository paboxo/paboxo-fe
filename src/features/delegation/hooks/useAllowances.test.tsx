import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useAllowances } from './useAllowances'
import { useDelegation } from './useDelegation'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const DELEGATE = '0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A' as const
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

// Covers R30: list a residual allowance and revoke it to 0.
describe('useAllowances', () => {
  it('lists a residual allowance and revokes it to zero', async () => {
    const getAllowance = vi
      .spyOn(mockChainAdapter, 'getAllowance')
      .mockImplementation((token) =>
        Promise.resolve(token === TOKENS.pxUSDT.address ? 5_000_000n : 0n),
      )
    const approve = vi.spyOn(mockChainAdapter, 'approve')

    const { result } = renderHook(() => useAllowances(market), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.allowances.length).toBe(1)
    })
    expect(result.current.allowances[0]?.symbol).toBe('pxUSDT')

    await act(async () => {
      await result.current.revoke(TOKENS.pxUSDT.address)
    })
    expect(approve).toHaveBeenLastCalledWith(
      TOKENS.pxUSDT.address,
      market.poolAddress,
      0n,
    )

    getAllowance.mockRestore()
    approve.mockRestore()
  })
})

// Covers R23: a delegation write records the allowance.
describe('useDelegation', () => {
  it('grants borrow delegation for the given delegate and cap', async () => {
    const grant = vi.spyOn(mockChainAdapter, 'approveBorrowDelegation')
    const { result } = renderHook(() => useDelegation(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.grantBorrow(DELEGATE, 1_000_000_000n)
    })
    expect(grant).toHaveBeenCalledWith(market.poolAddress, DELEGATE, 1_000_000_000n)
    expect(result.current.state).toBe('confirmed')
    grant.mockRestore()
  })
})
