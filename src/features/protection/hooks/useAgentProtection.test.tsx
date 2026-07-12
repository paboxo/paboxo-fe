import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useAgentProtection } from './useAgentProtection'

// Non-zero keeper so PROTECTION_UNCONFIGURED doesn't short-circuit the flow.
const { KEEPER } = vi.hoisted(() => ({
  KEEPER: '0x2222222222222222222222222222222222222222' as const,
}))

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

vi.mock('#/lib/contracts', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    PROTECTION: {
      agentKeeper: KEEPER,
      feeTreasury: '0x3333333333333333333333333333333333333333' as const,
      feeToken: '0x4852Bc014401415C4CE4788A04cAB019d1527aAa' as const,
      feeAmount: 1_000_000n,
    },
  })
})

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const HASH = `0x${'ab'.repeat(32)}` as const
const market = MOCK_MARKETS[0]

let switchChainAsync: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  switchChainAsync = vi.fn().mockResolvedValue(undefined)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync,
  } as unknown as ReturnType<typeof useSwitchChain>)
})

// Covers AE3: the free toggle grants/revokes rebalance-delegation with no
// payment step, through the write wrapper.
describe('useAgentProtection', () => {
  it('enable() grants the keeper delegation (pool, agentKeeper, true) with no payment', async () => {
    const grant = vi
      .spyOn(mockChainAdapter, 'approveRebalanceDelegation')
      .mockResolvedValue(HASH)

    const { result } = renderHook(() => useAgentProtection(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.enable()
    })

    expect(grant).toHaveBeenCalledWith(market.poolAddress, KEEPER, true)
    expect(result.current.state).toBe('confirmed')
    grant.mockRestore()
  })

  it('disable() revokes the keeper delegation (pool, agentKeeper, false)', async () => {
    const grant = vi
      .spyOn(mockChainAdapter, 'approveRebalanceDelegation')
      .mockResolvedValue(HASH)

    const { result } = renderHook(() => useAgentProtection(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.disable()
    })

    expect(grant).toHaveBeenCalledWith(market.poolAddress, KEEPER, false)
    grant.mockRestore()
  })

  it('prompts a chain switch before sending when the wallet is on the wrong chain', async () => {
    mockUseAccount.mockReturnValue({
      address: USER,
      chainId: 1,
      isConnected: true,
    } as unknown as ReturnType<typeof useAccount>)
    const grant = vi
      .spyOn(mockChainAdapter, 'approveRebalanceDelegation')
      .mockResolvedValue(HASH)

    const { result } = renderHook(() => useAgentProtection(market), {
      wrapper: QueryWrapper,
    })

    await act(async () => {
      await result.current.enable()
    })

    expect(switchChainAsync).toHaveBeenCalled()
    expect(grant).toHaveBeenCalledWith(market.poolAddress, KEEPER, true)
    grant.mockRestore()
  })

  it('exposes active from the on-chain delegation read (getRebalanceDelegation)', async () => {
    const read = vi
      .spyOn(mockChainAdapter, 'getRebalanceDelegation')
      .mockResolvedValue(true)

    const { result } = renderHook(() => useAgentProtection(market), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.active).toBe(true))
    expect(read).toHaveBeenCalledWith(market.poolAddress, USER, KEEPER)
    read.mockRestore()
  })
})
