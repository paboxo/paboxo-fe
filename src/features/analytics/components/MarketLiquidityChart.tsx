import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { formatUsd } from '#/lib/format'
import type { MarketView } from '#/features/markets/types'
import { useLiquidityHistory } from '../hooks/useLiquidityHistory'
import { LiquidityChart } from './LiquidityChart'

/**
 * Liquidity-over-time for a market (U8). Renders the indexer series when it
 * exists; until the indexer records liquidity snapshots it falls back to a
 * current-value indicator rather than a fabricated trend (KTD4).
 */
export function MarketLiquidityChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = useLiquidityHistory(market.poolAddress)

  return (
    <section className="island-shell flex flex-col gap-3 rounded-2xl p-5">
      <h3 className="display-title m-0 text-base font-semibold">Liquidity</h3>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error ? (
        <EmptyState
          title="Couldn't load liquidity"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : data.length > 0 ? (
        <LiquidityChart data={data} />
      ) : (
        <div className="flex flex-col gap-1">
          <span className="num text-2xl font-semibold text-[var(--sea-ink)]">
            {market.availableLiquidityUsd !== undefined
              ? formatUsd(market.availableLiquidityUsd)
              : '—'}
          </span>
          <span className="text-[0.78rem] text-[var(--sea-ink-soft)]">
            Available now. The liquidity trend appears once the indexer records
            snapshots.
          </span>
        </div>
      )}
    </section>
  )
}
