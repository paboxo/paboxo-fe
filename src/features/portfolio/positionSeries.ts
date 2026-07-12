import type { HistoryPoint } from '#/lib/data'
import type { PositionHistoryUsd } from './hooks/usePositionHistory'

export interface MergedPoint {
  timestamp: number
  supply: number
  collateral: number
  debt: number
}

/** The value of a sorted daily series at day `t`, carried forward (0 before it
 *  starts) — so three series with different day sets share one x-axis. */
function valueAt(series: HistoryPoint[], t: number): number {
  let value = 0
  for (const point of series) {
    if (point.timestamp <= t) value = point.value
    else break
  }
  return value
}

function mergedValueAt(
  rows: MergedPoint[],
  t: number,
  key: 'supply' | 'collateral' | 'debt',
): number {
  let value = 0
  for (const point of rows) {
    if (point.timestamp <= t) value = point[key]
    else break
  }
  return value
}

/** Sum several pools' merged series onto one union-of-days axis (carry-forward)
 *  — the portfolio total supply / collateral / debt in USD over time. */
export function aggregateMerged(perPool: MergedPoint[][]): MergedPoint[] {
  const days = [...new Set(perPool.flat().map((p) => p.timestamp))].sort(
    (a, b) => a - b,
  )
  return days.map((t) => ({
    timestamp: t,
    supply: perPool.reduce(
      (s, rows) => s + mergedValueAt(rows, t, 'supply'),
      0,
    ),
    collateral: perPool.reduce(
      (s, rows) => s + mergedValueAt(rows, t, 'collateral'),
      0,
    ),
    debt: perPool.reduce((s, rows) => s + mergedValueAt(rows, t, 'debt'), 0),
  }))
}

/** Merge the supply/collateral/debt series onto a single union-of-days x-axis. */
export function mergePositionSeries(
  history: PositionHistoryUsd,
): MergedPoint[] {
  const days = [
    ...new Set(
      [...history.supply, ...history.collateral, ...history.debt].map(
        (p) => p.timestamp,
      ),
    ),
  ].sort((a, b) => a - b)
  return days.map((t) => ({
    timestamp: t,
    supply: valueAt(history.supply, t),
    collateral: valueAt(history.collateral, t),
    debt: valueAt(history.debt, t),
  }))
}
