import { describe, expect, it } from 'vitest'
import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatTokenAmount,
  formatUsd,
  toDecimalString,
} from './index'

describe('formatCompact', () => {
  it('renders full grouped numbers below the threshold', () => {
    expect(formatCompact(999)).toBe('999')
    expect(formatCompact(99_999)).toBe('99,999')
  })

  it('compacts at or above 100,000', () => {
    expect(formatCompact(100_000)).toBe('100K')
    expect(formatCompact(4_231_905)).toBe('4.2M')
    expect(formatCompact(1_200_000_000)).toBe('1.2B')
  })
})

describe('formatNumber round-down', () => {
  it('rounds down withdrawable amounts, never overstating', () => {
    expect(formatNumber(1.239, { maxFractionDigits: 2, roundDown: true })).toBe(
      '1.23',
    )
  })

  it('rounds half-up by default', () => {
    expect(formatNumber(1.239, { maxFractionDigits: 2 })).toBe('1.24')
  })
})

describe('formatUsd', () => {
  it('is 2dp with a dust floor', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(0.004)).toBe('< $0.01')
    expect(formatUsd(1204.5)).toBe('$1,204.50')
  })

  it('compacts large aggregates when asked', () => {
    expect(formatUsd(4_231_905, { compact: true })).toBe('$4.2M')
  })
})

describe('percentages', () => {
  it('formats APY at 2dp', () => {
    expect(formatPercent(5.24)).toBe('5.24%')
  })

  it('pairs deltas with an explicit sign', () => {
    expect(formatSignedPercent(4.12)).toBe('+4.12%')
    expect(formatSignedPercent(-0.8)).toBe('-0.80%')
    expect(formatSignedPercent(0)).toBe('0.00%')
  })
})

describe('token amounts', () => {
  it('reads decimals as an argument, never hardcoded', () => {
    expect(toDecimalString(1_500_000n, 6)).toBe('1.5')
    expect(toDecimalString(1_500_000n, 18)).toBe('0.0000000000015')
    // Same raw amount formats differently by token decimals.
    expect(formatTokenAmount(1_500_000n, 6)).toBe('1.5')
    expect(formatTokenAmount(1_500_000n, 18)).toBe('< 0.0000001')
  })

  it('shows the user’s own entered amount at full precision', () => {
    expect(formatTokenAmount(1_234_567n, 6, { full: true })).toBe('1.234567')
  })

  it('renders zero plainly', () => {
    expect(formatTokenAmount(0n, 6)).toBe('0')
  })
})
