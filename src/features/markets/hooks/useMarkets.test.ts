import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { useMarket, useMarkets } from './useMarkets'

// Covers R11, R13: markets are derived from the chain adapter's live reads.
describe('useMarkets', () => {
  it('loads the 4 markets through the adapter', async () => {
    const { result } = renderHook(() => useMarkets(), { wrapper: QueryWrapper })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data).toHaveLength(4)
    expect(result.current.data.map((m) => m.id)).toContain('pxwhsk')
  })

  it('derives a supply APY below the borrow APR and a scaled price', async () => {
    const { result } = renderHook(() => useMarkets(), { wrapper: QueryWrapper })
    await waitFor(() => {
      expect(result.current.data.length).toBe(4)
    })
    const pxwhsk = result.current.data.find((m) => m.id === 'pxwhsk')
    expect(pxwhsk).toBeDefined()
    // Supply APY is the borrow rate scaled by utilization and reserve factor.
    expect(pxwhsk?.supplyApy).toBeGreaterThan(0)
    expect(pxwhsk?.supplyApy).toBeLessThan(pxwhsk?.borrowApr ?? 0)
    // 8-dp feed price ($0.05 seed) scaled to a display number.
    expect(pxwhsk?.priceUsd).toBeCloseTo(0.05, 6)
    // Utilization ≈ 61% from the fixture totals.
    expect(pxwhsk?.utilization).toBeGreaterThan(60)
    expect(pxwhsk?.utilization).toBeLessThan(62)
  })
})

describe('useMarket', () => {
  it('returns a single market by id', async () => {
    const { result } = renderHook(() => useMarket('pxwbtc'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    })
    expect(result.current.data?.id).toBe('pxwbtc')
  })

  it('returns undefined for an unknown id once loaded', async () => {
    const { result } = renderHook(() => useMarket('nope'), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data).toBeUndefined()
  })
})
