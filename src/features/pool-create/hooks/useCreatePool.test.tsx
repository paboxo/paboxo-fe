import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { CORE, TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { useCreatePool } from './useCreatePool'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const

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

// Covers R25, R6.
describe('useCreatePool', () => {
  it('approves the Factory for the exact seed and returns the new pool', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const create = vi.spyOn(mockChainAdapter, 'createLendingPool')
    const { result } = renderHook(() => useCreatePool(), {
      wrapper: QueryWrapper,
    })

    let pool: string | undefined
    await act(async () => {
      pool = await result.current.createPool({
        collateralToken: TOKENS.pxWHSK.address,
        seedAmount: 2_000_000_000n, // 2,000 pxUSDT
        minSeed: 1_000_000_000n,
        ltv: 700_000_000_000_000_000n,
      })
    })

    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      CORE.lendingPoolFactory,
      2_000_000_000n,
    )
    expect(create).toHaveBeenCalledOnce()
    expect(pool).toMatch(/^0x[0-9a-fA-F]+$/)
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
    create.mockRestore()
  })

  it('blocks a seed below the minimum before sending', async () => {
    const create = vi.spyOn(mockChainAdapter, 'createLendingPool')
    const { result } = renderHook(() => useCreatePool(), {
      wrapper: QueryWrapper,
    })

    let pool: string | undefined
    await act(async () => {
      pool = await result.current.createPool({
        collateralToken: TOKENS.pxWHSK.address,
        seedAmount: 500_000_000n, // below the 1,000 minimum
        minSeed: 1_000_000_000n,
        ltv: 700_000_000_000_000_000n,
      })
    })

    expect(create).not.toHaveBeenCalled()
    expect(pool).toBeUndefined()
    expect(result.current.state).toBe('error')
    create.mockRestore()
  })
})
