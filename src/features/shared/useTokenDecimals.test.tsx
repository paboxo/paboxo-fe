/**
 * The decimals cache freezes a *verified* answer forever and an unverified one
 * not at all. `enrichPools` never rejects, so an unreachable RPC resolves a
 * perfectly successful query in which every token reads `unreadable`. Freezing
 * that would keep CreatePoolPanel's seed form blocked for the life of the tab,
 * long after the chain came back — a page reload as the only cure.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TOKENS } from '#/lib/contracts'
import type { PoolsEnrichment, VerifiedDecimals } from '#/lib/data/types'
import { useTokenDecimals } from './useTokenDecimals'

const enrichPools = vi.fn()

vi.mock('#/lib/data', () => ({
  getAdapters: () => ({ chain: { enrichPools } }),
}))

const TOKEN = TOKENS.pxUSDT.address
const KEY = TOKEN.toLowerCase()

const enrichment = (decimals: VerifiedDecimals): PoolsEnrichment => ({
  pools: {},
  tokens: { [KEY]: { decimals, price: { available: false } } },
})

const UNREADABLE = enrichment({
  valid: false,
  reason: 'unreadable',
  registry: 6,
})
const VERIFIED = enrichment({ valid: true, decimals: 6 })

// A batch where the requested token verified but a SIBLING did not. `staleTime`
// must key off "every token verified", not "some" — otherwise one healthy token
// would freeze a batch that still holds a failed read, wedging the seed form.
const OTHER = '0x00000000000000000000000000000000000000ff'
const PARTIAL: PoolsEnrichment = {
  pools: {},
  tokens: {
    [KEY]: {
      decimals: { valid: true, decimals: 6 },
      price: { available: false },
    },
    [OTHER]: {
      decimals: { valid: false, reason: 'unreadable', registry: 18 },
      price: { available: false },
    },
  },
}

/** One client shared across both mounts, so caching is what's under test. */
function sharedWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  enrichPools.mockReset()
})

describe('useTokenDecimals', () => {
  it('retries after a failed read, so a transient RPC outage is recoverable', async () => {
    enrichPools
      .mockResolvedValueOnce(UNREADABLE)
      .mockResolvedValueOnce(VERIFIED)
    const wrapper = sharedWrapper()

    const first = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(first.result.current.isLoading).toBe(false))
    expect(first.result.current.decimals).toBeUndefined()
    first.unmount()

    // The unverified answer is stale on arrival: remounting reads the chain again.
    const second = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(second.result.current.decimals).toBe(6))
    expect(enrichPools).toHaveBeenCalledTimes(2)
  })

  it('stays stale while a sibling token is unverified, even though this one passed', async () => {
    // The requested token reads 6 both times; only a refetch (staleTime 0
    // because a sibling failed) explains the second call. `.some` instead of
    // `.every` would freeze after the first and never issue it.
    enrichPools.mockResolvedValue(PARTIAL)
    const wrapper = sharedWrapper()

    const first = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(first.result.current.decimals).toBe(6))
    first.unmount()

    const second = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(second.result.current.decimals).toBe(6))
    expect(enrichPools).toHaveBeenCalledTimes(2)
  })

  it('never re-reads a verified value — decimals are immutable', async () => {
    enrichPools.mockResolvedValue(VERIFIED)
    const wrapper = sharedWrapper()

    const first = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(first.result.current.decimals).toBe(6))
    first.unmount()

    const second = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(second.result.current.decimals).toBe(6))
    expect(enrichPools).toHaveBeenCalledTimes(1)
  })

  it('reports undefined rather than the registry constant when decimals mismatch', async () => {
    enrichPools.mockResolvedValue(
      enrichment({
        valid: false,
        reason: 'mismatch',
        registry: 6,
        onChain: 18,
      }),
    )
    const wrapper = sharedWrapper()

    const { result } = renderHook(() => useTokenDecimals(TOKEN), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.decimals).toBeUndefined()
  })
})
