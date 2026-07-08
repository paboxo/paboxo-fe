import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useBorrow } from './useBorrow'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const OTHER = '0x9999999999999999999999999999999999999999' as const
const market = MOCK_MARKETS[0] // pxwhsk: fixture max-borrow ≈ 5,600 pxUSDT

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

// Covers R19, R9; AE3, AE5.
describe('useBorrow', () => {
  it('books debt to the caller on a self-borrow within power', async () => {
    const borrowDebt = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const { result } = renderHook(() => useBorrow(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.borrow(100_000_000n) // 100 pxUSDT
    })
    expect(borrowDebt).toHaveBeenCalledWith(
      market.poolAddress,
      { amount: 100_000_000n, chainId: 177n, destGasLimit: 0 },
      USER,
    )
    expect(result.current.state).toBe('confirmed')
    borrowDebt.mockRestore()
  })

  it('blocks a borrow above live max-borrow before sending (AE3)', async () => {
    const borrowDebt = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const { result } = renderHook(() => useBorrow(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.borrow(6_000_000_000n) // 6,000 > ~5,600 max
    })
    expect(borrowDebt).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/borrowing power/)
    borrowDebt.mockRestore()
  })

  it('blocks a delegated borrow with no prior delegation (AE5)', async () => {
    const borrowDebt = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const { result } = renderHook(() => useBorrow(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.borrow(100_000_000n, OTHER)
    })
    expect(borrowDebt).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/delegation/)
    borrowDebt.mockRestore()
  })
})
