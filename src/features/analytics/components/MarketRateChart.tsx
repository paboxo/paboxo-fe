import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { useRateHistory } from '../hooks/useRateHistory'
import { deriveRateSeries } from '../deriveRateSeries'
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
      ) : error ? (
        <EmptyState
          title="Couldn't load rate history"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : data.length === 0 ? (
        market.borrowApr !== undefined && market.supplyApy !== undefined ? (
          // No indexed snapshots yet — chart a series derived from the current
          // on-chain rate so the trend is visible, and say so.
          <div className="flex flex-col gap-2">
            <RateChart
              data={deriveRateSeries(
                market.borrowApr,
                market.supplyApy,
                Math.floor(Date.now() / 1000),
              )}
            />
            <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
              Estimated from the current on-chain rate — real history appears
              once the indexer records snapshots.
            </span>
          </div>
        ) : (
          <EmptyState
            title="No rate history yet"
            description="The trend appears once the indexer records snapshots."
          />
        )
      ) : (
        <RateChart data={data} />
      )}
    </section>
  )
}
