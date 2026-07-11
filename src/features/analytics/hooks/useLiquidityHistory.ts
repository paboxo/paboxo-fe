/**
 * Liquidity history (U8) — a market's available-liquidity series for the chart,
 * sourced through the indexer adapter. Empty until the indexer records liquidity
 * snapshots; the consumer then shows a current-value indicator (KTD4).
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { LiquidityPoint } from '#/lib/data'
import type { QueryResult } from '#/features/shared/query'

export function useLiquidityHistory(
  pool: Address,
): QueryResult<LiquidityPoint[]> {
  const query = useQuery({
    queryKey: ['liquidity-history', pool],
    queryFn: () => getAdapters().indexer.getLiquidityHistory(pool),
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
