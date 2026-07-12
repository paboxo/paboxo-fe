/**
 * A user's daily position history for one pool in USD (R5, R6): lender supply,
 * collateral, and debt over time, sourced through the indexer adapter. Supply
 * and debt are pxUSDT (≈ USD); collateral is scaled to USD by the market's
 * current price. Falls back to the preview address before a wallet connects.
 */
import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { getAdapters } from '#/lib/data'
import type { HistoryPoint } from '#/lib/data'
import type { QueryResult } from '#/features/shared/query'
import { PREVIEW_ADDRESS } from '#/features/shared/preview'
import type { MarketView } from '#/features/markets/types'

export interface PositionHistoryUsd {
  supply: HistoryPoint[]
  collateral: HistoryPoint[]
  debt: HistoryPoint[]
}

const EMPTY: PositionHistoryUsd = { supply: [], collateral: [], debt: [] }

function scale(points: HistoryPoint[], factor: number): HistoryPoint[] {
  if (factor === 1) return points
  return points.map((p) => ({
    timestamp: p.timestamp,
    value: p.value * factor,
  }))
}

export function usePositionHistory(
  market: MarketView,
): QueryResult<PositionHistoryUsd> {
  const { address } = useAccount()
  const user = address ?? PREVIEW_ADDRESS
  const price = market.priceUsd ?? 0
  const query = useQuery({
    queryKey: ['position-history', market.poolAddress, user],
    queryFn: () =>
      getAdapters().indexer.getUserPositionHistory(user, market.poolAddress),
  })
  const raw = query.data
  const data = useMemo<PositionHistoryUsd>(() => {
    if (!raw) return EMPTY
    return {
      supply: raw.supply,
      collateral: scale(raw.collateral, price),
      debt: raw.debt,
    }
  }, [raw, price])

  return { data, isLoading: query.isLoading, error: query.error }
}
