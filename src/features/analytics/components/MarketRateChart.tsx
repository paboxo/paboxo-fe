import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { useRateHistory } from '../hooks/useRateHistory'
import { RateChart } from './RateChart'

/** Rate-history chart for a market (U5) — sourced through the indexer adapter. */
export function MarketRateChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = useRateHistory(market.poolAddress)

  return (
    <section className="island-shell flex flex-col gap-3 rounded-2xl p-5">
      <h3 className="display-title m-0 text-base font-semibold">
        Rate history
      </h3>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error || data.length === 0 ? (
        <EmptyState
          title="No rate history yet"
          description="Rate history appears once the indexer has data for this market."
        />
      ) : (
        <RateChart data={data} />
      )}
    </section>
  )
}
