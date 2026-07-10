import { describe, expect, it } from 'vitest'
import { WAD } from './units'
import { supplyRateWad, utilizationWad } from './utilization'

// Covers R9: utilization + supply-rate derivation in WAD.
describe('utilizationWad', () => {
  it('is totalBorrowAssets × 1e18 / totalSupplyAssets', () => {
    // 1,586,000 / 2,600,000 ≈ 61%.
    const util = utilizationWad(1_586_000_000000n, 2_600_000_000000n)
    expect(util).toBe((1_586_000_000000n * WAD) / 2_600_000_000000n)
    // sanity: ~0.61 * 1e18
    expect(util).toBeGreaterThan((60n * WAD) / 100n)
    expect(util).toBeLessThan((62n * WAD) / 100n)
  })

  it('is 0 when totalSupplyAssets == 0', () => {
    expect(utilizationWad(0n, 0n)).toBe(0n)
    expect(utilizationWad(1_000n, 0n)).toBe(0n)
  })
})

describe('supplyRateWad', () => {
  it('scales the borrow rate by utilization and the reserve factor', () => {
    const borrowRate = (7n * WAD) / 100n // 7%
    const util = (60n * WAD) / 100n // 60%
    const reserve = (15n * WAD) / 100n // 15%
    const supplyRate = supplyRateWad(borrowRate, util, reserve)
    // 7% * 0.60 * 0.85 = 3.57%
    expect(supplyRate).toBe(
      (((borrowRate * util) / WAD) * (WAD - reserve)) / WAD,
    )
    expect(supplyRate).toBeLessThan(borrowRate)
  })

  it('is 0 when utilization is 0', () => {
    expect(supplyRateWad((7n * WAD) / 100n, 0n, (15n * WAD) / 100n)).toBe(0n)
  })
})
