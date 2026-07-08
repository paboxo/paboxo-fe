/**
 * Core number formatting (U2, R5). Pure, display-only. Callers keep full
 * precision internally (bigint) and format at the edge.
 */

export interface NumberFormatOptions {
  maxFractionDigits?: number
  minFractionDigits?: number
  /** Round toward zero so the UI never overstates a withdrawable/available amount. */
  roundDown?: boolean
}

/** Above this magnitude, aggregates render compact (100K, 4.2M, …). */
export const COMPACT_THRESHOLD = 100_000

const COMPACT_TIERS: ReadonlyArray<{ value: number; suffix: string }> = [
  { value: 1e12, suffix: 'T' },
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'K' },
]

/** Placeholder for a non-finite value. */
export const NON_FINITE = '—'

export function roundTo(
  value: number,
  digits: number,
  roundDown = false,
): number {
  const factor = 10 ** digits
  const scaled = value * factor
  return (roundDown ? Math.floor(scaled) : Math.round(scaled)) / factor
}

export function trimTrailingZeros(text: string): string {
  if (!text.includes('.')) return text
  return text.replace(/\.?0+$/, '')
}

export function formatNumber(
  value: number,
  options: NumberFormatOptions = {},
): string {
  const {
    maxFractionDigits = 2,
    minFractionDigits = 0,
    roundDown = false,
  } = options
  if (!Number.isFinite(value)) return NON_FINITE
  const rounded = roundDown ? roundTo(value, maxFractionDigits, true) : value
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  })
}

/**
 * Compact large aggregates. Below {@link COMPACT_THRESHOLD} the full grouped
 * number renders; at or above it, one K/M/B/T tier with ≤1 fractional digit
 * (0 digits once the scaled value reaches 100).
 */
export function formatCompact(
  value: number,
  options: NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return NON_FINITE
  const abs = Math.abs(value)
  if (abs < COMPACT_THRESHOLD) {
    return formatNumber(value, {
      maxFractionDigits: options.maxFractionDigits ?? 2,
      minFractionDigits: options.minFractionDigits,
      roundDown: options.roundDown,
    })
  }
  for (const tier of COMPACT_TIERS) {
    if (abs >= tier.value) {
      const scaled = value / tier.value
      const digits =
        Math.abs(scaled) >= 100 ? 0 : (options.maxFractionDigits ?? 1)
      return trimTrailingZeros(scaled.toFixed(digits)) + tier.suffix
    }
  }
  return formatNumber(value, options)
}
