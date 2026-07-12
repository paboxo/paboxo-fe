/**
 * Derive a user's DAILY position-history series for one pool from their events
 * (R5, R6): lender supply, collateral, and debt. The indexer has no per-user
 * snapshot entity, so we replay the +/- events into a running end-of-day
 * balance — a point per day, oldest first — and carry the last balance forward
 * to today so a single event still draws a line to now instead of a lone dot.
 */
import { toWholeNumber } from '#/lib/math'
import type { HistoryPoint } from '../types'

const DAY_SECONDS = 86_400

/** One balance move: `+1` increases (supply/borrow), `-1` decreases (withdraw/repay). */
export interface SupplyDelta {
  /** Unix seconds. */
  timestamp: number
  amount: bigint
  direction: 1 | -1
}

export function deriveDailySeries(
  deltas: SupplyDelta[],
  decimals: number,
  nowTs: number,
): HistoryPoint[] {
  const sorted = [...deltas].sort((a, b) => a.timestamp - b.timestamp)
  let cumulative = 0n
  const byDay = new Map<number, bigint>()
  for (const delta of sorted) {
    cumulative += delta.direction === 1 ? delta.amount : -delta.amount
    if (cumulative < 0n) cumulative = 0n
    const dayTs = Math.floor(delta.timestamp / DAY_SECONDS) * DAY_SECONDS
    byDay.set(dayTs, cumulative)
  }
  const points = [...byDay.entries()].map(([timestamp, amount]) => ({
    timestamp,
    value: toWholeNumber(amount, decimals),
  }))
  // Carry the last balance forward to today so the line reaches "now".
  const last = points.at(-1)
  const nowDay = Math.floor(nowTs / DAY_SECONDS) * DAY_SECONDS
  if (last && nowDay > last.timestamp) {
    points.push({ timestamp: nowDay, value: last.value })
  }
  return points
}
