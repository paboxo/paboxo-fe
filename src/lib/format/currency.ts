/**
 * USD and percentage formatting (U2, R5). USD is 2dp with a `< $0.01` dust
 * floor; percentages are fixed-dp; signed variants pair a sign with the value
 * so direction never rides on color alone.
 */
import { formatCompact, formatNumber, NON_FINITE } from './number'

export interface UsdOptions {
  compact?: boolean
}

export function formatUsd(value: number, options: UsdOptions = {}): string {
  if (!Number.isFinite(value)) return NON_FINITE
  if (value === 0) return '$0.00'
  const abs = Math.abs(value)
  if (abs < 0.01) return '< $0.01'
  const sign = value < 0 ? '-' : ''
  const body = options.compact
    ? formatCompact(abs, { maxFractionDigits: 1 })
    : formatNumber(abs, { maxFractionDigits: 2, minFractionDigits: 2 })
  return `${sign}$${body}`
}

export function formatPercent(value: number, dp = 2): string {
  if (!Number.isFinite(value)) return NON_FINITE
  return `${formatNumber(value, { maxFractionDigits: dp, minFractionDigits: dp })}%`
}

/** Percentage with an explicit leading sign for deltas (paired with an arrow in the UI). */
export function formatSignedPercent(value: number, dp = 2): string {
  if (!Number.isFinite(value)) return NON_FINITE
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const magnitude = formatNumber(Math.abs(value), {
    maxFractionDigits: dp,
    minFractionDigits: dp,
  })
  return `${sign}${magnitude}%`
}
