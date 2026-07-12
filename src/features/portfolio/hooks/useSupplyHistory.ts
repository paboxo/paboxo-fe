/**
 * A user's daily supplied-value history for one pool (R5, R6), sourced through
 * the indexer adapter — mock now, live GraphQL once a per-user supply-snapshot
 * entity exists. Never touches the chain adapter (KTD3). Falls back to the
 * preview address so the chart still renders before a wallet connects.
 */
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { SupplyPoint } from '#/lib/data'
import type { QueryResult } from '#/features/shared/query'
import { PREVIEW_ADDRESS } from '#/features/shared/preview'

export function useSupplyHistory(pool: Address): QueryResult<SupplyPoint[]> {
  const { address } = useAccount()
  const user = address ?? PREVIEW_ADDRESS
  const query = useQuery({
    queryKey: ['supply-history', pool, user],
    queryFn: () => getAdapters().indexer.getUserSupplyHistory(user, pool),
  })
  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
