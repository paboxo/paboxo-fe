import { describe, expect, it } from 'vitest'
import { deriveDailySupply } from './supplyHistory'
import type { SupplyDelta } from './supplyHistory'

const DAY = 86_400
const M = 1_000_000n // 1 pxUSDT (6dp)

describe('deriveDailySupply', () => {
  it('replays events into an end-of-day cumulative balance (daily buckets)', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: 5, amount: 1000n * M, direction: 1 },
      { timestamp: 100, amount: 500n * M, direction: 1 }, // same day 0
      { timestamp: DAY + 10, amount: 300n * M, direction: -1 }, // day 1
    ]
    const series = deriveDailySupply(deltas, 6)
    expect(series).toEqual([
      { timestamp: 0, suppliedUsd: 1500 },
      { timestamp: DAY, suppliedUsd: 1200 },
    ])
  })

  it('sorts out-of-order events before replaying', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: DAY + 10, amount: 300n * M, direction: -1 },
      { timestamp: 5, amount: 1000n * M, direction: 1 },
    ]
    const series = deriveDailySupply(deltas, 6)
    expect(series[0]).toEqual({ timestamp: 0, suppliedUsd: 1000 })
    expect(series[1]).toEqual({ timestamp: DAY, suppliedUsd: 700 })
  })

  it('clamps the balance at zero (a withdraw never goes negative)', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: 5, amount: 100n * M, direction: 1 },
      { timestamp: DAY + 5, amount: 500n * M, direction: -1 },
    ]
    const series = deriveDailySupply(deltas, 6)
    expect(series[1].suppliedUsd).toBe(0)
  })

  it('returns an empty series with no events', () => {
    expect(deriveDailySupply([], 6)).toEqual([])
  })
})
