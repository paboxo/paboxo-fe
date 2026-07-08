/**
 * Unit primitives (U4, KTD7). Everything is raw on-chain integer math (bigint);
 * decimals are always passed in, never hardcoded — pxUSDT is 6dp, others 18/8dp.
 */

/** 1e18 — the protocol's fixed-point scale (WAD). 1e18 = 100% for rates. */
export const WAD = 10n ** 18n

/** `10^n` as a bigint. */
export function pow10(n: number): bigint {
  return 10n ** BigInt(n)
}

/** `a * b / denominator`, returning 0 when the denominator is 0 (matches the
 *  contract convention for empty pools — no division-by-zero revert). */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === 0n) return 0n
  return (a * b) / denominator
}

/** Rescale a fixed-point integer from one decimal precision to another. */
export function scaleDecimals(
  value: bigint,
  fromDecimals: number,
  toDecimals: number,
): bigint {
  if (toDecimals === fromDecimals) return value
  if (toDecimals > fromDecimals) {
    return value * pow10(toDecimals - fromDecimals)
  }
  return value / pow10(fromDecimals - toDecimals)
}

/** Convert a raw token amount to a whole-unit JS number, for display only. */
export function toWholeNumber(value: bigint, decimals: number): number {
  const denom = pow10(decimals)
  const whole = value / denom
  const frac = value % denom
  return Number(whole) + Number(frac) / Number(denom)
}
