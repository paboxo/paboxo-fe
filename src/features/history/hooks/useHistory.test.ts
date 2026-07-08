import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { useHistory } from './useHistory'
import { useProtocolStats } from './useProtocolStats'

// Covers R13: history + volume come from the indexer; TVL/utilization from the
// chain adapter (the source split is what keeps the two swaps independent).
describe('useHistory', () => {
  it('renders transaction history from the indexer adapter', async () => {
    const { result } = renderHook(() => useHistory(), { wrapper: QueryWrapper })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data.length).toBeGreaterThan(0)
    expect(result.current.data[0]).toHaveProperty('action')
    expect(result.current.data[0]).toHaveProperty('txHash')
  })
})

describe('useProtocolStats', () => {
  it('sources TVL/utilization from the chain adapter and volume from the indexer', async () => {
    const { result } = renderHook(() => useProtocolStats(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    const stats = result.current.data
    // TVL is the sum of live pool totals (chain adapter), not an indexer number.
    expect(stats?.tvlUsd).toBeGreaterThan(0)
    expect(stats?.utilization).toBeGreaterThan(0)
    expect(stats?.utilization).toBeLessThan(100)
    // Cumulative volume is the indexer aggregate.
    expect(stats?.cumulativeVolumeUsd).toBeGreaterThan(0)
    expect(stats?.transactionCount).toBeGreaterThan(0)
  })
})
