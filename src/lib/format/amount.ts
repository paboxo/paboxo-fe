/**
 * Token-amount formatting (U2, R5). Converts base-unit bigints to display
 * strings with per-token decimals — never hardcoded — and keeps the user's own
 * entered amounts and balances at full precision.
 */
import {
  COMPACT_THRESHOLD,
  formatCompact,
  formatNumber,
  trimTrailingZeros,
} from './number'

/** Exact decimal string for a base-unit amount, no precision loss. */
export function toDecimalString(raw: bigint, decimals: number): string {
  if (decimals < 0) throw new Error('decimals must be >= 0')
  const negative = raw < 0n
  const digits = (negative ? -raw : raw).toString().padStart(decimals + 1, '0')
  const cut = digits.length - decimals
  const intPart = digits.slice(0, cut)
  const fracPart = decimals > 0 ? digits.slice(cut) : ''
  const body = trimTrailingZeros(fracPart ? `${intPart}.${fracPart}` : intPart)
  return negative ? `-${body}` : body
}

/** Lossy convenience for display math only — never for on-chain values. */
export function toNumber(raw: bigint, decimals: number): number {
  return Number(toDecimalString(raw, decimals))
}

export interface TokenAmountOptions {
  maxFractionDigits?: number
  compact?: boolean
  /** The user's own entered amount / balance — full precision, never compacted. */
  full?: boolean
}

export function formatTokenAmount(
  raw: bigint,
  decimals: number,
  options: TokenAmountOptions = {},
): string {
  const exact = toDecimalString(raw, decimals)
  if (options.full) return trimTrailingZeros(exact)
  const value = Number(exact)
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const maxFractionDigits = options.maxFractionDigits ?? (abs >= 1 ? 2 : 7)
  const smallest = 10 ** -maxFractionDigits
  if (abs < smallest) return `< ${smallest.toFixed(maxFractionDigits)}`
  if (options.compact && abs >= COMPACT_THRESHOLD) {
    return formatCompact(value, { maxFractionDigits: 1 })
  }
  return formatNumber(value, { maxFractionDigits, roundDown: true })
}

/** Denomination helpers for the token⟷USD flip (R19). */
export function tokensToUsd(amountTokens: number, priceUsd: number): number {
  return amountTokens * priceUsd
}

export function usdToTokens(usd: number, priceUsd: number): number {
  return priceUsd === 0 ? 0 : usd / priceUsd
}
