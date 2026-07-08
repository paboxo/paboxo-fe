import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { BASE, CROSS_CHAIN } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useCrossChainSupply } from './useCrossChainSupply'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const market = MOCK_MARKETS[3] // cross-chain pxWHSK market
let switchChainAsync: ReturnType<typeof vi.fn>

beforeEach(() => {
  switchChainAsync = vi.fn().mockResolvedValue(undefined)
  // Wallet is on HashKey 177 — the hook must switch it to Base first.
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync,
  } as unknown as ReturnType<typeof useSwitchChain>)
})

// Covers R26, R27; AE7.
describe('useCrossChainSupply', () => {
  it('switches to Base, sends, then models the two-hop to delivered', async () => {
    const quote = vi.spyOn(mockChainAdapter, 'quoteCrossChainSupply')
    const send = vi.spyOn(mockChainAdapter, 'supplyToHashKey')
    const { result } = renderHook(() => useCrossChainSupply(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.supply(1_000n * 10n ** 18n)
    })

    // Network switched to Base before the quote/send.
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: BASE.id })
    expect(quote).toHaveBeenCalled()
    expect(send).toHaveBeenCalledOnce()
    // Base tx confirmed; the bridge resolved to delivered via the indexer.
    expect(result.current.state).toBe('confirmed')
    expect(result.current.messageId).toMatch(/^0x[0-9a-f]+$/)
    expect(result.current.bridgeStatus).toBe('delivered')
    quote.mockRestore()
    send.mockRestore()
  })

  it('approves the Base token pool before sending', async () => {
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const { result } = renderHook(() => useCrossChainSupply(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.supply(1_000n * 10n ** 18n)
    })
    expect(approve).toHaveBeenCalledWith(
      CROSS_CHAIN.bridgeToken.base,
      CROSS_CHAIN.burnMintTokenPool.base,
      1_000n * 10n ** 18n,
    )
    approve.mockRestore()
  })

  it('does not send a zero amount', async () => {
    const send = vi.spyOn(mockChainAdapter, 'supplyToHashKey')
    const { result } = renderHook(() => useCrossChainSupply(market), {
      wrapper: QueryWrapper,
    })
    await act(async () => {
      await result.current.supply(0n)
    })
    expect(send).not.toHaveBeenCalled()
    expect(result.current.bridgeStatus).toBe('idle')
    send.mockRestore()
  })
})
