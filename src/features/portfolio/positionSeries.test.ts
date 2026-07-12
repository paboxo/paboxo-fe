import { describe, expect, it } from 'vitest'
import { aggregateMerged, mergePositionSeries } from './positionSeries'

const DAY = 86_400

describe('mergePositionSeries', () => {
  it('merges the three series onto a shared, sorted day axis', () => {
    const merged = mergePositionSeries({
      supply: [
        { timestamp: 0, value: 100 },
        { timestamp: DAY, value: 150 },
      ],
      collateral: [{ timestamp: DAY, value: 2 }],
      debt: [{ timestamp: 2 * DAY, value: 40 }],
    })
    expect(merged.map((p) => p.timestamp)).toEqual([0, DAY, 2 * DAY])
  })

  it('carries each series forward (and is zero before it starts)', () => {
    const merged = mergePositionSeries({
      supply: [{ timestamp: 0, value: 100 }],
      collateral: [{ timestamp: 2 * DAY, value: 5 }],
      debt: [],
    })
    // supply carried forward across all days; collateral zero until it starts.
    expect(merged).toEqual([
      { timestamp: 0, supply: 100, collateral: 0, debt: 0 },
      { timestamp: 2 * DAY, supply: 100, collateral: 5, debt: 0 },
    ])
  })

  it('is empty when every series is empty', () => {
    expect(
      mergePositionSeries({ supply: [], collateral: [], debt: [] }),
    ).toEqual([])
  })
})

describe('aggregateMerged', () => {
  it('sums pools onto one axis, carrying each pool forward', () => {
    const poolA = [
      { timestamp: 0, supply: 100, collateral: 10, debt: 5 },
      { timestamp: DAY, supply: 100, collateral: 10, debt: 5 },
    ]
    const poolB = [{ timestamp: DAY, supply: 50, collateral: 2, debt: 1 }]
    const total = aggregateMerged([poolA, poolB])
    expect(total).toEqual([
      // Day 0: only pool A is active.
      { timestamp: 0, supply: 100, collateral: 10, debt: 5 },
      // Day 1: both pools sum.
      { timestamp: DAY, supply: 150, collateral: 12, debt: 6 },
    ])
  })

  it('is empty with no pools', () => {
    expect(aggregateMerged([])).toEqual([])
  })
})
