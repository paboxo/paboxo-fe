import { describe, expect, it } from 'vitest'
import { mergePositionSeries } from './positionSeries'

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
