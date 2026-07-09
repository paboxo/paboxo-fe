import { describe, expect, it } from 'vitest'
import { borrowRateAtUtilization } from './irm'
import type { IrmCurveParams } from './irm'

// pxWHSK's real on-chain IRM: base 0.5%, rate@opt 7%, max 120%, opt 75%, maxUtil 90%.
const PXWHSK: IrmCurveParams = {
  basePct: 0.5,
  rateAtOptimalPct: 7,
  maxRatePct: 120,
  optimalUtilPct: 75,
  maxUtilPct: 90,
}

describe('borrowRateAtUtilization', () => {
  it('returns the base rate at 0% utilization', () => {
    expect(borrowRateAtUtilization(0, PXWHSK)).toBe(0.5)
  })

  it('returns rate@optimal at the optimal utilization (the kink)', () => {
    expect(borrowRateAtUtilization(75, PXWHSK)).toBeCloseTo(7, 6)
  })

  it('returns maxRate at the max utilization', () => {
    expect(borrowRateAtUtilization(90, PXWHSK)).toBeCloseTo(120, 6)
  })

  it('stays flat at maxRate above the max utilization', () => {
    expect(borrowRateAtUtilization(95, PXWHSK)).toBe(120)
    expect(borrowRateAtUtilization(100, PXWHSK)).toBe(120)
  })

  it('is linear on the gentle slope below optimal', () => {
    // Halfway to optimal (37.5%): base + (7 - 0.5) * 0.5 = 3.75.
    expect(borrowRateAtUtilization(37.5, PXWHSK)).toBeCloseTo(3.75, 6)
  })

  it('is steeply linear between optimal and max utilization', () => {
    // 82.5% is halfway from 75→90: 7 + (120 - 7) * 0.5 = 63.5.
    expect(borrowRateAtUtilization(82.5, PXWHSK)).toBeCloseTo(63.5, 6)
  })
})
