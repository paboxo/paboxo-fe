import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { usePosition } from './usePosition'

// Covers R12, R9: the dashboard position is derived from adapter reads + math.
describe('usePosition', () => {
  it('builds a coherent funded position for the preview user', async () => {
    const { result } = renderHook(() => usePosition(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    const position = result.current.data
    expect(position).not.toBeNull()
    expect(position?.netWorthUsd).toBeGreaterThan(0)
    // Lender pxUSDT supply + pxWHSK collateral both present.
    const supplySymbols = position?.supplies.map((s) => s.symbol) ?? []
    expect(supplySymbols).toContain('pxUSDT')
    expect(supplySymbols).toContain('pxWHSK')
    // A pxUSDT debt derived via the shared debt formula.
    expect(position?.borrows.map((b) => b.symbol)).toContain('pxUSDT')
    expect(position?.borrows[0]?.valueUsd).toBeGreaterThan(0)
  })

  it('derives a healthy health factor and a liquidation price below spot', async () => {
    const { result } = renderHook(() => usePosition(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    const position = result.current.data
    expect(position?.healthFactor).toBeGreaterThan(1)
    expect(position?.currentPrice).toBeCloseTo(0.05, 6)
    expect(position?.liquidationPrice).toBeLessThan(position?.currentPrice ?? 0)
  })

  it('returns null for the empty (new-user) preview', async () => {
    const { result } = renderHook(() => usePosition({ empty: true }), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.data).toBeNull()
  })
})
