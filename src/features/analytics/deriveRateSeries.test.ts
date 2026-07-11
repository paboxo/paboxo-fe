import { describe, expect, it } from 'vitest'
import { deriveRateSeries } from './deriveRateSeries'

const NOW = 1_800_000_000

describe('deriveRateSeries', () => {
  it('produces the requested number of daily points ending at now', () => {
    const series = deriveRateSeries(5, 2.75, NOW, 14)
    expect(series).toHaveLength(14)
    expect(series[series.length - 1].timestamp).toBe(NOW)
    // One day apart, ascending.
    expect(series[1].timestamp - series[0].timestamp).toBe(86_400)
  })

  it('anchors the final point exactly to the current rate', () => {
    const series = deriveRateSeries(5, 2.75, NOW)
    const last = series[series.length - 1]
    expect(last.borrowApr).toBe(5)
    expect(last.supplyApy).toBe(2.75)
  })

  it('never emits a negative rate', () => {
    const series = deriveRateSeries(0.1, 0.05, NOW)
    for (const point of series) {
      expect(point.borrowApr).toBeGreaterThanOrEqual(0)
      expect(point.supplyApy).toBeGreaterThanOrEqual(0)
    }
  })
})
