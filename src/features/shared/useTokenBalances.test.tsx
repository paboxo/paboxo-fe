import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { WAD } from '#/lib/math'
import { TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { useTokenBalance, useTokenBalances } from './useTokenBalances'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))
const mockUseAccount = vi.mocked(useAccount)

const USER = '0x1111111111111111111111111111111111111111'

afterEach(() => vi.restoreAllMocks())

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

  it('one failing token read does not zero the others', async () => {
    mockUseAccount.mockReturnValue({ address: USER } as never)
    vi.spyOn(mockChainAdapter, 'getTokenBalance').mockImplementation((token) =>
      token === TOKENS.pxWBTC.address
        ? Promise.reject(new Error('read failed'))
        : Promise.resolve(123n),
    )
    const { result } = renderHook(() => useTokenBalances(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // The failed token is omitted (not 0); the rest still resolve.
    expect(result.current.balances.pxWBTC).toBeUndefined()
    expect(result.current.balances.pxUSDT).toBe(123n)
    expect(result.current.isError).toBe(false)
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
