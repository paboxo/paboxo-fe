import type { RatePoint } from '#/lib/data'

const DAY_SECONDS = 86_400

/**
 * A recent rate series derived from the *current* on-chain borrow/supply rate,
 * used only when the indexer has recorded no snapshots yet. The last point is
 * exactly the current rate; earlier points wobble gently so the chart shows a
 * trend instead of a flat bar. This is an estimate — real history replaces it as
 * soon as the indexer returns any points (the caller labels it as such).
 */
export function deriveRateSeries(
  borrowApr: number,
  supplyApy: number,
  nowSeconds: number,
  points = 14,
): RatePoint[] {
  return Array.from({ length: points }, (_, i) => {
    const stepsFromEnd = points - 1 - i // 0 at the most recent point
    // Wobble decays to 0 at "now", so the last point equals the current rate.
    const decay = stepsFromEnd / points
    const wobble = ((i % 3) - 1) * 0.35 * decay
    return {
      timestamp: nowSeconds - stepsFromEnd * DAY_SECONDS,
      borrowApr: Number(Math.max(0, borrowApr + wobble).toFixed(2)),
      supplyApy: Number(Math.max(0, supplyApy + wobble * 0.6).toFixed(2)),
    }
  })
}
