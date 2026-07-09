import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { WAD } from '#/lib/math'
import { TOKENS } from '#/lib/contracts'
import { useTokenBalance, useTokenBalances } from './useTokenBalances'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))
const mockUseAccount = vi.mocked(useAccount)

const USER = '0x1111111111111111111111111111111111111111'

describe('useTokenBalances', () => {
  it('returns per-token wallet balances for the connected user', async () => {
    mockUseAccount.mockReturnValue({ address: USER } as never)
    const { result } = renderHook(() => useTokenBalances(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // Matches BALANCE_FIXTURES.
    expect(result.current.balances.pxUSDT).toBe(25_000_000_000n)
    expect(result.current.balances.pxWHSK).toBe(40_000n * WAD)
    expect(result.current.balances.pxWETH).toBe(5n * WAD)
  })

  it('stays empty and disabled with no wallet', () => {
    mockUseAccount.mockReturnValue({ address: undefined } as never)
    const { result } = renderHook(() => useTokenBalances(), {
      wrapper: QueryWrapper,
    })
    expect(result.current.balances).toEqual({})
  })
})

describe('useTokenBalance', () => {
  it('returns the balance for a token address', async () => {
    mockUseAccount.mockReturnValue({ address: USER } as never)
    const { result } = renderHook(
      () => useTokenBalance(TOKENS.pxWETH.address),
      { wrapper: QueryWrapper },
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.balance).toBe(5n * WAD)
  })

  it('is disabled and undefined without a token', () => {
    mockUseAccount.mockReturnValue({ address: USER } as never)
    const { result } = renderHook(() => useTokenBalance(undefined), {
      wrapper: QueryWrapper,
    })
    expect(result.current.balance).toBeUndefined()
  })
})
