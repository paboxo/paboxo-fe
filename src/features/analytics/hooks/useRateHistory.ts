/**
 * Rate history (U5) — a market's borrow/supply rate series for the chart,
 * sourced through the indexer adapter (mock now, live GraphQL when an endpoint
 * is set). Never touches the chain adapter (KTD3).
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { RatePoint } from '#/lib/data'
import type { QueryResult } from '#/features/shared/query'

export function useRateHistory(pool: Address): QueryResult<RatePoint[]> {
  const query = useQuery({
    queryKey: ['rate-history', pool],
    queryFn: () => getAdapters().indexer.getRateHistory(pool),
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
