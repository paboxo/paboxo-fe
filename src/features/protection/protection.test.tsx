import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { mockPaymentGateway } from '#/lib/payments/gateway.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useProtection, useProtectionStatus } from './hooks/useProtection'

// Non-zero keeper/treasury so PROTECTION_UNCONFIGURED doesn't short-circuit the
// flow. Hoisted so both the mock factory and the assertions share the values.
// FEE_TOKEN is the real pxUSDT address (display-only; unused by these assertions).
const { KEEPER, TREASURY, FEE_TOKEN } = vi.hoisted(() => ({
  KEEPER: '0x2222222222222222222222222222222222222222' as const,
  TREASURY: '0x3333333333333333333333333333333333333333' as const,
  FEE_TOKEN: '0x4852Bc014401415C4CE4788A04cAB019d1527aAa' as const,
}))

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

// Override only PROTECTION; keep the real MARKETS/TOKENS/abis and the real
// PROTECTION_UNCONFIGURED (which now evaluates against the non-zero config).
vi.mock('#/lib/contracts', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    PROTECTION: {
      agentKeeper: KEEPER,
      feeTreasury: TREASURY,
      feeToken: FEE_TOKEN,
      feeAmount: 1_000_000n,
    },
  })
})

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const HASH = `0x${'ab'.repeat(32)}` as const
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

// Covers the HSP-gated enable flow: pay → verify (ACCEPT) → grant rebalance-
// delegation to the keeper, tracking the HSP legs as `phase`.
describe('useProtection', () => {
  it('happy path: pays, verifies ACCEPT, then grants rebalance-delegation', async () => {
    const grant = vi
      .spyOn(mockChainAdapter, 'approveRebalanceDelegation')
      .mockResolvedValue(HASH)
    // Spy the mock gateway's HSP legs (call through) to prove pay → verify ran.
    // The transient `phase` string can't be sampled from renders reliably — the
    // mock settles within a microtask, so React coalesces the paying/verifying/
    // activating updates into one commit. Assert the observable calls instead.
    const paySpy = vi.spyOn(mockPaymentGateway, 'pay')
    const verifySpy = vi.spyOn(mockPaymentGateway, 'verify')

    const { result } = renderHook(() => useProtection(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.enableProtection()
    })

    // Paying leg: the fee is sent to the treasury for the configured amount.
    expect(paySpy).toHaveBeenCalledWith({
      to: TREASURY,
      amount: 1_000_000n,
      compliance: undefined,
    })
    // Verifying leg ran; the activating leg grants (pool, agentKeeper, true).
    expect(verifySpy).toHaveBeenCalled()
    expect(grant).toHaveBeenCalledWith(market.poolAddress, KEEPER, true)
    // The verifier's ACCEPT decision + explorer link are surfaced.
    expect(result.current.decision).toEqual({ ok: true, outcomeClass: 'ACCEPT' })
    expect(result.current.explorerHref).toMatch(/^https:\/\/hsp\.example\//)
    // On-chain tx confirmed, phase settled back to idle.
    expect(result.current.state).toBe('confirmed')
    expect(result.current.phase).toBe('idle')

    grant.mockRestore()
    paySpy.mockRestore()
    verifySpy.mockRestore()
  })

  it('disableProtection revokes the keeper delegation (pool, agentKeeper, false)', async () => {
    const grant = vi
      .spyOn(mockChainAdapter, 'approveRebalanceDelegation')
      .mockResolvedValue(HASH)

    const { result } = renderHook(() => useProtection(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.disableProtection()
    })

    expect(grant).toHaveBeenCalledWith(market.poolAddress, KEEPER, false)
    grant.mockRestore()
  })
})

describe('useProtectionStatus', () => {
  it('reflects the keeper delegation read from the adapter', async () => {
    const read = vi
      .spyOn(mockChainAdapter, 'getRebalanceDelegation')
      .mockResolvedValue(true)

    const { result } = renderHook(() => useProtectionStatus(market), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.active).toBe(true))
    expect(read).toHaveBeenCalledWith(market.poolAddress, USER, KEEPER)
    read.mockRestore()
  })
})
