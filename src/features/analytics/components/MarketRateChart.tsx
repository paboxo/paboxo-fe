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
      ) : error ? (
        <EmptyState
          title="Couldn't load rate history"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : data.length === 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                Borrow APR
              </span>
              <span className="num text-xl font-semibold text-[var(--sea-ink)]">
                {market.borrowApr !== undefined
                  ? `${market.borrowApr.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                Supply APY
              </span>
              <span className="num text-xl font-semibold text-[var(--sea-ink)]">
                {market.supplyApy !== undefined
                  ? `${market.supplyApy.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
          </div>
          <span className="text-[0.78rem] text-[var(--sea-ink-soft)]">
            Current on-chain rate. The history trend appears once the indexer
            records snapshots.
          </span>
        </div>
      ) : (
        <RateChart data={data} />
      )}
    </section>
  )
}
