/**
 * Derive a user's DAILY supplied-balance series for one pool from their
 * supply/withdraw liquidity events (R5, R6). The indexer has no per-user supply
 * snapshot entity, so we replay the events into a running balance — the same
 * shape the rate-history chart uses (a point per day, oldest first).
 */
import { toWholeNumber } from '#/lib/math'
import type { SupplyPoint } from '../types'

const DAY_SECONDS = 86_400

/** One liquidity move: `+1` supply, `-1` withdraw. Amount in token base units. */
export interface SupplyDelta {
  /** Unix seconds. */
  timestamp: number
  amount: bigint
  direction: 1 | -1
}

/**
 * Replay deltas into an end-of-day cumulative supplied balance. The balance is
 * clamped at zero (a withdraw can't drive it negative), and each day carries the
 * last balance seen that day. `decimals` converts the base-unit balance to a
 * whole token amount — for the pxUSDT liquidity token that is ~USD.
 */
export function deriveDailySupply(
  deltas: SupplyDelta[],
  decimals: number,
): SupplyPoint[] {
  const sorted = [...deltas].sort((a, b) => a.timestamp - b.timestamp)
  let cumulative = 0n
  const byDay = new Map<number, bigint>()
  for (const delta of sorted) {
    cumulative += delta.direction === 1 ? delta.amount : -delta.amount
    if (cumulative < 0n) cumulative = 0n
    const dayTs = Math.floor(delta.timestamp / DAY_SECONDS) * DAY_SECONDS
    byDay.set(dayTs, cumulative)
  }
  return [...byDay.entries()].map(([timestamp, amount]) => ({
    timestamp,
    suppliedUsd: toWholeNumber(amount, decimals),
  }))
}
