import { describe, expect, it } from 'vitest'
import { sumPoolStats } from './totals'

describe('sumPoolStats', () => {
  it('counts only active pools and sums their USD figures', () => {
    const totals = sumPoolStats([
      { active: true, suppliedUsd: 1000, collateralUsd: 600, debtUsd: 400 },
      { active: true, suppliedUsd: 500, collateralUsd: 200, debtUsd: 100 },
      { active: false, suppliedUsd: 999, collateralUsd: 999, debtUsd: 999 },
    ])
    expect(totals.activePools).toBe(2)
    expect(totals.suppliedUsd).toBe(1500)
    expect(totals.collateralUsd).toBe(800)
    expect(totals.debtUsd).toBe(500)
    expect(totals.netUsd).toBe(1500 + 800 - 500)
  })

  it('is all zeros with no active pools', () => {
    expect(sumPoolStats([])).toEqual({
      activePools: 0,
      suppliedUsd: 0,
      collateralUsd: 0,
      debtUsd: 0,
      netUsd: 0,
    })
  })
})
