/**
 * Transaction history (U8) — sourced from the indexer adapter (mock now, real
 * subgraph in U19). The chain adapter is never used here; history is
 * event-derived data the indexer owns.
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { HistoryEvent } from '#/lib/data'
import type { QueryResult } from '#/features/shared/query'
import { PREVIEW_ADDRESS } from '#/features/shared/preview'

function loadHistory(address: Address): Promise<HistoryEvent[]> {
  return getAdapters().indexer.getUserHistory(address)
}

export function useHistory(
  address: Address = PREVIEW_ADDRESS,
): QueryResult<HistoryEvent[]> {
  const query = useQuery({
    queryKey: ['history', address],
    queryFn: () => loadHistory(address),
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
