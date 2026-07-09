import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper, createTestQueryClient } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { useWriteAction } from './useWriteAction'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSwitchChain: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)

const USER = '0x1111111111111111111111111111111111111111' as const
const POOL = '0xB45693e9F28ceb47fC3c81b45535e3D808196406' as const
const HASH = `0x${'ab'.repeat(32)}` as const

function connected(chainId: number) {
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
}

let switchChainAsync: ReturnType<typeof vi.fn>

beforeEach(() => {
  switchChainAsync = vi.fn().mockResolvedValue(undefined)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync,
  } as unknown as ReturnType<typeof useSwitchChain>)
})

function renderWrite(requiredChainId?: number) {
  return renderHook(() => useWriteAction({ requiredChainId }), {
    wrapper: QueryWrapper,
  })
}

// Covers R16, R24, R28, R9; AE2, AE6.
describe('useWriteAction', () => {
  it('blocks when no wallet is connected', async () => {
    mockUseAccount.mockReturnValue({
      isConnected: false,
    } as unknown as ReturnType<typeof useAccount>)
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toMatch(/Connect your wallet/)
  })

  it('blocks a disabled pre-flight before sending (AE-guard)', async () => {
    connected(177)
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({
        preflight: { enabled: false, reason: 'Not enough liquidity' },
        send,
      })
    })
    expect(send).not.toHaveBeenCalled()
    expect(result.current.state).toBe('error')
    expect(result.current.revert?.message).toBe('Not enough liquidity')
  })

  it('approves the exact amount then sends and confirms', async () => {
    connected(177)
    const approve = vi.spyOn(mockChainAdapter, 'approve')
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: POOL,
          amount: 1_000_000n,
        },
        send,
      })
    })
    // mock allowance is 0 → approval fires with the exact amount, spender = pool.
    expect(approve).toHaveBeenCalledWith(
      TOKENS.pxUSDT.address,
      POOL,
      1_000_000n,
    )
    expect(send).toHaveBeenCalledOnce()
    expect(result.current.state).toBe('confirmed')
    approve.mockRestore()
  })

  it('prompts a chain switch when on the wrong network (AE6)', async () => {
    connected(8453) // Base, not HashKey 177
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(switchChainAsync).toHaveBeenCalledWith({ chainId: 177 })
    expect(result.current.state).toBe('confirmed')
  })

  it('surfaces a humane message on an on-chain revert', async () => {
    connected(177)
    const send = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('revert'), { name: 'HealthFactorTooLow' }),
      )
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(result.current.state).toBe('reverted')
    expect(result.current.revert?.message).toMatch(/risk of liquidation/)
  })

  it('treats a wallet rejection as a distinct, non-error outcome', async () => {
    connected(177)
    const send = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('denied'), { code: 4001 }))
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(result.current.state).toBe('rejected')
    expect(result.current.revert).toBeNull()
  })

  it('waits for the send receipt before confirming', async () => {
    connected(177)
    const waitSpy = vi.spyOn(mockChainAdapter, 'waitForReceipt')
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(waitSpy).toHaveBeenCalledWith(HASH)
    expect(result.current.state).toBe('confirmed')
    waitSpy.mockRestore()
  })

  it('waits for the approval receipt before the send, and the send receipt after', async () => {
    connected(177)
    const order: string[] = []
    const waitSpy = vi
      .spyOn(mockChainAdapter, 'waitForReceipt')
      .mockImplementation(async () => {
        order.push('wait')
      })
    const send = vi.fn().mockImplementation(async () => {
      order.push('send')
      return HASH
    })
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: POOL,
          amount: 1_000_000n,
        },
        send,
      })
    })
    // approval mined (wait) → send broadcast → send mined (wait), never send-before-approval-receipt.
    expect(order).toEqual(['wait', 'send', 'wait'])
    waitSpy.mockRestore()
  })

  it('reverts when the send receipt fails to mine (broadcast != mined)', async () => {
    connected(177)
    // The send now returns on broadcast; a mined-but-reverted / timed-out tx
    // surfaces via waitForReceipt, not send.
    const waitSpy = vi
      .spyOn(mockChainAdapter, 'waitForReceipt')
      .mockRejectedValue(new Error('receipt timeout'))
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderWrite()
    await act(async () => {
      await result.current.run({ send })
    })
    expect(result.current.state).toBe('reverted')
    waitSpy.mockRestore()
  })

  it('stays confirmed when post-confirm cache invalidation fails', async () => {
    connected(177)
    // A rejected refetch must not flip a mined tx back to a failure state.
    const client = createTestQueryClient()
    client.invalidateQueries = vi.fn().mockRejectedValue(new Error('refetch'))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const send = vi.fn().mockResolvedValue(HASH)
    const { result } = renderHook(() => useWriteAction(), { wrapper })
    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.run({ send, invalidateKeys: [['markets']] })
    })
    expect(result.current.state).toBe('confirmed')
    expect(ok).toBe(true)
  })
})
