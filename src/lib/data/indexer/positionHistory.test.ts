import { describe, expect, it } from 'vitest'
import { deriveDailySeries } from './positionHistory'
import type { SupplyDelta } from './positionHistory'

const DAY = 86_400
const M = 1_000_000n // 1 pxUSDT (6dp)
const NOW = 10 * DAY

describe('deriveDailySeries', () => {
  it('replays events into an end-of-day cumulative balance (daily buckets)', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: 5, amount: 1000n * M, direction: 1 },
      { timestamp: 100, amount: 500n * M, direction: 1 }, // same day 0
      { timestamp: DAY + 10, amount: 300n * M, direction: -1 }, // day 1
    ]
    const series = deriveDailySeries(deltas, 6, DAY + 20)
    expect(series[0]).toEqual({ timestamp: 0, value: 1500 })
    expect(series[1]).toEqual({ timestamp: DAY, value: 1200 })
  })

  it('carries the last balance forward to today (single event → a line)', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: 5, amount: 100_000n * M, direction: 1 },
    ]
    const series = deriveDailySeries(deltas, 6, NOW)
    expect(series).toHaveLength(2)
    expect(series[0]).toEqual({ timestamp: 0, value: 100_000 })
    // A second point at "today" with the same balance extends the line to now.
    expect(series[1]).toEqual({ timestamp: 10 * DAY, value: 100_000 })
  })

  it('does not duplicate the point when the last event is already today', () => {
    const deltas: SupplyDelta[] = [
      { timestamp: NOW + 5, amount: 100n * M, direction: 1 },
    ]
    const series = deriveDailySeries(deltas, 6, NOW + 10)
    expect(series).toHaveLength(1)
  })

  it('clamps the balance at zero and returns [] with no events', () => {
    expect(
      deriveDailySeries(
        [
          { timestamp: 5, amount: 100n * M, direction: 1 },
          { timestamp: DAY + 5, amount: 500n * M, direction: -1 },
        ],
        6,
        DAY + 10,
      ).at(-1)?.value,
    ).toBe(0)
    expect(deriveDailySeries([], 6, NOW)).toEqual([])
  })
})
