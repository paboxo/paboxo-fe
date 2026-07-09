import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { MARKETS } from '#/lib/contracts'
import { useRateHistory } from './useRateHistory'

// Covers R6: rate history is sourced through the indexer adapter.
describe('useRateHistory', () => {
  it('returns a rate series for a market from the indexer', async () => {
    const { result } = renderHook(() => useRateHistory(MARKETS[0].pool), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data.length).toBeGreaterThan(0)
    expect(result.current.data[0]).toHaveProperty('borrowApr')
    expect(result.current.data[0]).toHaveProperty('supplyApy')
    expect(result.current.data[0]).toHaveProperty('timestamp')
  })
})
