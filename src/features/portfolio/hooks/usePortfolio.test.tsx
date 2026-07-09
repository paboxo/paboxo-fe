import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { usePortfolio } from './usePortfolio'

// Covers R5: category totals derived across pools from the aggregated position.
describe('usePortfolio', () => {
  it('categorizes the preview position into deposits / collateral / loans', async () => {
    const { result } = renderHook(() => usePortfolio(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    const summary = result.current.data
    // Preview user: pxUSDT lender deposit + pxWHSK collateral + a pxUSDT loan.
    expect(summary?.depositsUsd).toBeGreaterThan(0)
    expect(summary?.collateralUsd).toBeGreaterThan(0)
    expect(summary?.loansUsd).toBeGreaterThan(0)
    expect(summary?.positionsCount).toBeGreaterThan(0)
  })

  it('nets deposits + collateral against loans for net worth', async () => {
    const { result } = renderHook(() => usePortfolio(), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    const s = result.current.data
    // Net worth is coherent (positive, no NaN) and below gross supplies.
    expect(Number.isNaN(s?.netWorthUsd)).toBe(false)
    expect(s?.netWorthUsd).toBeGreaterThan(0)
    expect(s?.netWorthUsd).toBeLessThan(
      (s?.depositsUsd ?? 0) + (s?.collateralUsd ?? 0),
    )
  })
})
