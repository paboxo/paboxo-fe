/**
 * Pool list comparators (U5). Both rank a size signal **descending**, break ties
 * by **pool address ascending**, and push **unknown-size pools last** — after a
 * genuinely zero-supply pool, which is a real (known) zero, not a missing read.
 *
 *   - `bySupply`             — Earn ranks by pool size (`totalSupplyAssets`).
 *   - `byAvailableLiquidity` — Borrow ranks by what a borrower can take
 *                              (`totalSupplyAssets - totalBorrowAssets`).
 */
import type { MarketView } from './types'

/** A pool's sort key, or `undefined` for an unknown size (always sorts last). */
type SizeKey = (market: MarketView) => bigint | undefined

function tieByAddress(a: MarketView, b: MarketView): number {
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

function compareDescending(key: SizeKey) {
  return (a: MarketView, b: MarketView): number => {
    const ka = key(a)
    const kb = key(b)
    // Unknown size sorts after every known size (including a zero-supply pool).
    if (ka === undefined && kb === undefined) return tieByAddress(a, b)
    if (ka === undefined) return 1
    if (kb === undefined) return -1
    if (ka > kb) return -1
    if (ka < kb) return 1
    return tieByAddress(a, b)
  }
}

/** Earn: largest pool first. */
export const bySupply = compareDescending((market) =>
  market.sizeKnown ? (market.totalSupplyAssets ?? 0n) : undefined,
)

/** Borrow: most free liquidity first. */
export const byAvailableLiquidity = compareDescending((market) => {
  if (
    !market.sizeKnown ||
    market.totalSupplyAssets === undefined ||
    market.totalBorrowAssets === undefined
  ) {
    return undefined
  }
  const free = market.totalSupplyAssets - market.totalBorrowAssets
  return free > 0n ? free : 0n
})
