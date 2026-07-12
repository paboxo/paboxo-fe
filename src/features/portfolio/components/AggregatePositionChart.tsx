import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import type { MarketView } from '#/features/markets/types'
import { usePositionHistory } from '../hooks/usePositionHistory'
import { aggregateMerged, mergePositionSeries } from '../positionSeries'
import type { MergedPoint } from '../positionSeries'
import { PositionSeriesChart } from './PositionSeriesChart'

/** Headless per-pool history reader — reports one pool's merged series up (a
 *  hook can't run in a loop). Rows are memoised so the report is stable. */
function PoolHistoryCollector({
  market,
  onRows,
}: {
  market: MarketView
  onRows: (id: string, rows: MergedPoint[]) => void
}) {
  const { data } = usePositionHistory(market)
  const rows = useMemo(() => mergePositionSeries(data), [data])
  useEffect(() => {
    onRows(market.id, rows)
  }, [market.id, rows, onRows])
  return null
}

/**
 * The portfolio TOTAL over time (R5, R6): Supplied, Collateral, and Debt summed
 * across every pool, in USD. Sourced from the same per-pool reads the cards use
 * (cache-shared), so the totals match the per-pool charts.
 */
export function AggregatePositionChart() {
  const { data: markets, isLoading } = useMarkets()
  const [byPool, setByPool] = useState<Record<string, MergedPoint[]>>({})

  const onRows = useCallback((id: string, rows: MergedPoint[]) => {
    setByPool((prev) => (prev[id] === rows ? prev : { ...prev, [id]: rows }))
  }, [])

  if (isLoading) {
    return (
      <section className="island-shell rounded-2xl p-5">
        <LoadingCard rows={2} />
      </section>
    )
  }

  const total = aggregateMerged(Object.values(byPool))

  return (
    <section
      className="island-shell flex flex-col gap-3 rounded-2xl p-5"
      aria-label="Total position over time"
    >
      {markets.map((market) => (
        <PoolHistoryCollector key={market.id} market={market} onRows={onRows} />
      ))}
      <h3 className="display-title m-0 text-base font-semibold">
        Total over time (USD)
      </h3>
      {total.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Your total supply, collateral, and debt appear here once recorded."
        />
      ) : (
        <PositionSeriesChart rows={total} height={240} />
      )}
    </section>
  )
}
