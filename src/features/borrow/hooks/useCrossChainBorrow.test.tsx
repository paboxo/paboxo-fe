import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { BASE } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import {
  useCrossChainBorrow,
  useCrossChainBorrowFee,
} from './useCrossChainBorrow'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const market = MOCK_MARKETS[3] // cross-chain market, borrow token pxUSDT (6dp)
const AMOUNT = 100_000000n // 100 pxUSDT

beforeEach(() => {
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useSwitchChain>)
  // Defaults that clear the borrow gates; individual tests override as needed.
  vi.spyOn(mockChainAdapter, 'getMaxBorrowAmount').mockResolvedValue(
    1_000_000_000n,
  )
  vi.spyOn(mockChainAdapter, 'getMarketTotals').mockResolvedValue({
    totalSupplyAssets: 1_000_000_000000n,
    totalBorrowAssets: 0n,
    totalBorrowShares: 0n,
    totalSupplyShares: 1_000_000_000000n,
  })
  vi.spyOn(mockChainAdapter, 'getPrice').mockResolvedValue({
    price: 1n * 10n ** 8n,
    updatedAt: Math.floor(Date.now() / 1000),
  })
})

// Covers R4, R5, R6, R7, R10, R11.
describe('useCrossChainBorrow', () => {
  it('sends borrowDebt on Base with the fee as value, no approval, then delivers', async () => {
    const send = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const { result } = renderHook(() => useCrossChainBorrow(market), {
      wrapper: QueryWrapper,
    })

    let outcome
    await act(async () => {
      outcome = await result.current.borrow(AMOUNT)
    })

    expect(outcome).toEqual({ confirmed: true, delivered: true })
    expect(send).toHaveBeenCalledOnce()
    const [pool, params, onBehalf, value] = send.mock.calls[0]
    expect(pool).toBe(market.poolAddress)
    expect(params.chainId).toBe(BigInt(BASE.id))
    expect(onBehalf).toBe(USER)
    expect(value).toBe(500_000_000_000_000n) // the mock quoted fee
    // Receiving funds — never an approval (R7).
    expect(approve).not.toHaveBeenCalled()
    expect(result.current.state).toBe('confirmed')
    expect(result.current.bridgeStatus).toBe('delivered')
    send.mockRestore()
    approve.mockRestore()
  })

  it('blocks when native HSK cannot cover the fee (R9)', async () => {
    vi.spyOn(mockChainAdapter, 'getNativeBalance').mockResolvedValueOnce(1n)
    const send = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const { result } = renderHook(() => useCrossChainBorrow(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.borrow(AMOUNT)
    })

    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.bridgeStatus).toBe('idle')
    send.mockRestore()
  })

  it('blocks a borrow above max-borrow before sending', async () => {
    vi.spyOn(mockChainAdapter, 'getMaxBorrowAmount').mockResolvedValueOnce(1n)
    const send = vi.spyOn(mockChainAdapter, 'borrowDebt')
    const { result } = renderHook(() => useCrossChainBorrow(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.borrow(AMOUNT)
    })

    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    send.mockRestore()
  })
})

// Covers R8, KTD8.
describe('useCrossChainBorrowFee', () => {
  it('quotes the fee when Base is active and the amount is positive', async () => {
    const { result } = renderHook(
      () => useCrossChainBorrowFee(market, 100, true),
      { wrapper: QueryWrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(500_000_000_000_000n)
  })

  it('does not quote when the destination is not Base', async () => {
    const quote = vi.spyOn(mockChainAdapter, 'quoteCrossChainBorrow')
    const { result } = renderHook(
      () => useCrossChainBorrowFee(market, 100, false),
      { wrapper: QueryWrapper },
    )
    // Disabled query — never fetches.
    expect(result.current.fetchStatus).toBe('idle')
    expect(quote).not.toHaveBeenCalled()
    quote.mockRestore()
  })
})
