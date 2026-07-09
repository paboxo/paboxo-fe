import { formatPercent } from '#/lib/format'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { useIrmCurve } from '../hooks/useIrmCurve'
import { IrmCurveChart } from './IrmCurveChart'

/**
 * Interest-rate-model curve for a market — the borrow-rate-vs-utilization model,
 * read on-chain through the chain adapter (config in mock mode).
 */
export function MarketIrmChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = useIrmCurve(market)

  return (
    <section className="island-shell flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="display-title m-0 text-base font-semibold">
          Interest rate model
        </h3>
        <span className="num text-sm text-[var(--sea-ink-soft)]">
          Utilization {formatPercent(market.utilization)}
        </span>
      </div>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error || !data ? (
        <EmptyState
          title="Rate model unavailable"
          description="The interest-rate model couldn’t be loaded for this market."
        />
      ) : (
        <IrmCurveChart curve={data} />
      )}
    </section>
  )
}
