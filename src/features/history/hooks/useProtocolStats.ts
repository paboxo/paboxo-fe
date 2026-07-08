/**
 * Protocol stats (U8, R13). TVL and utilization are read from the CHAIN adapter
 * (live pool totals across markets) — never the indexer; cumulative volume and
 * counts come from the INDEXER adapter. Keeping the split explicit is what makes
 * the two independent swaps (chain → U18, indexer → U19) safe.
 */
import { useQuery } from '@tanstack/react-query'
import { MARKETS, TOKENS } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { toWholeNumber, utilizationWad, wadToPercent } from '#/lib/math'
import type { QueryResult } from '#/features/shared/query'

const BORROW_DECIMALS = TOKENS.pxUSDT.decimals

export interface ProtocolStats {
  /** From the chain adapter (pool totals). */
  tvlUsd: number
  utilization: number
  /** From the indexer adapter. */
  cumulativeVolumeUsd: number
  transactionCount: number
}

async function loadStats(): Promise<ProtocolStats> {
  const { chain, indexer } = getAdapters()
  const [totalsList, aggregates] = await Promise.all([
    Promise.all(MARKETS.map((market) => chain.getMarketTotals(market.pool))),
    indexer.getProtocolAggregates(),
  ])

  const totalSupply = totalsList.reduce(
    (sum, totals) => sum + totals.totalSupplyAssets,
    0n,
  )
  const totalBorrow = totalsList.reduce(
    (sum, totals) => sum + totals.totalBorrowAssets,
    0n,
  )

  return {
    tvlUsd: toWholeNumber(totalSupply, BORROW_DECIMALS),
    utilization: wadToPercent(utilizationWad(totalBorrow, totalSupply)),
    cumulativeVolumeUsd: aggregates.cumulativeVolumeUsd,
    transactionCount: aggregates.transactionCount,
  }
}

export function useProtocolStats(): QueryResult<ProtocolStats | undefined> {
  const query = useQuery({ queryKey: ['protocol-stats'], queryFn: loadStats })
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}
