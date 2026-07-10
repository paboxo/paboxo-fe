/**
 * Column-definition helpers shared by the Earn and Borrow lists.
 *
 * Both surfaces build a `PoolColumn[]` and hand it to the shell. Everything
 * except the column set and the comparator is identical, so these live here —
 * the two lists were already the duplication the shell exists to remove.
 */
import type { ReactNode } from 'react'
import { formatUsd } from '#/lib/format'
import type { PoolColumn } from './components/PoolTable'
import type { MarketView } from './types'

/** A right-aligned numeric column. */
export function numColumn(
  header: string,
  cell: (market: MarketView) => ReactNode,
): PoolColumn {
  return { header, align: 'right', cell }
}

/** Compact USD. `undefined` renders an em dash — never a zero that lies. */
export function compactUsd(value: number | undefined): string {
  return formatUsd(value, { compact: true })
}
