import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { usePositionHistory } from '../hooks/usePositionHistory'
import { mergePositionSeries } from '../positionSeries'
import { PositionSeriesChart } from './PositionSeriesChart'

/**
 * One pool's position history (R5, R6): Supplied, Collateral, and Debt in USD
 * over time, sourced through the indexer adapter with distinct loading,
 * unavailable (error), and empty states.
 */
export function PositionHistoryChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = usePositionHistory(market)
  const rows = mergePositionSeries(data)

  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0 text-[0.8rem] font-semibold text-[var(--sea-ink-soft)]">
        Position over time
      </h4>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error ? (
        <EmptyState
          title="Couldn't load history"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Your supply, collateral, and debt appear here once recorded."
        />
      ) : (
        <PositionSeriesChart rows={rows} />
      )}
    </section>
  )
}
