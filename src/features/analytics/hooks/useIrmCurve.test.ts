import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useIrmCurve } from './useIrmCurve'

const market = MOCK_MARKETS[0] // pxWHSK

// Covers R6 / interest-rate-model: the curve is built from the adapter's IRM params.
describe('useIrmCurve', () => {
  it('builds the two-slope curve from the market IRM params', async () => {
    const { result } = renderHook(() => useIrmCurve(market), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    const curve = result.current.data
    expect(curve?.optimalUtil).toBeCloseTo(75, 6)
    expect(curve?.maxUtil).toBeCloseTo(90, 6)
    expect(curve?.params.maxRatePct).toBeCloseTo(120, 6)
    expect(curve?.params.basePct).toBeCloseTo(0.5, 6)
    // Current utilization marker comes from the market view (mock ≈ 61%).
    expect(curve?.currentUtil).toBe(market.utilization)
  })

  it('leaves currentUtil undefined when the pool size is unknown', async () => {
    // A pool whose balances did not resolve has no utilization. `?? 0` here
    // would draw a confident "Current 0%" marker on the curve — a lie that
    // reads exactly like a genuinely idle pool. The marker must be absent.
    const unknown = { ...market, utilization: undefined }
    const { result } = renderHook(() => useIrmCurve(unknown), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    expect(result.current.data?.currentUtil).toBeUndefined()
    // The rest of the curve is still fully drawable without it.
    expect(result.current.data?.points.length).toBeGreaterThan(0)
  })

  it('samples the curve including the kink points', async () => {
    const { result } = renderHook(() => useIrmCurve(market), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => {
      expect(result.current.data).not.toBeNull()
    })
    const points = result.current.data?.points ?? []
    const atOptimal = points.find((p) => p.util === 75)
    const atMax = points.find((p) => p.util === 90)
    expect(atOptimal?.borrowApr).toBeCloseTo(7, 1)
    expect(atMax?.borrowApr).toBeCloseTo(120, 1)
    // Monotonically non-decreasing.
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].borrowApr).toBeGreaterThanOrEqual(
        points[i - 1].borrowApr,
      )
    }
  })
})
