import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatUsd } from '#/lib/format'
import { StatTile } from '#/components/ui/StatTile'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'
import { usePositionHistory } from '../hooks/usePositionHistory'
import { aggregateMerged, mergePositionSeries } from '../positionSeries'
import type { MergedPoint } from '../positionSeries'
import { sumPoolStats } from '../totals'
import type { PoolStat } from '../totals'
import { METRICS, breakdownFor } from '../metrics'
import type { Contribution, MetricKey } from '../metrics'
import { MetricChart } from './MetricChart'
import { MetricTabs } from './MetricTabs'

interface PoolData {
  market: MarketView
  stat: PoolStat
  rows: MergedPoint[]
}

/** Headless per-pool reader — current stat + history, reported up (stable refs
 *  so the report doesn't loop). A hook can't run in a loop. */
function PoolDataCollector({
  market,
  onData,
}: {
  market: MarketView
  onData: (id: string, data: PoolData) => void
}) {
  const { data: pos } = useMarketPosition(market.id)
  const { data: hist } = usePositionHistory(market)

  const stat = useMemo<PoolStat>(() => {
    const active =
      pos != null && (pos.supplies.length > 0 || pos.borrows.length > 0)
    return {
      active,
      suppliedUsd:
        pos?.supplies.find((s) => s.symbol === market.borrowSymbol)?.valueUsd ??
        0,
      collateralUsd:
        pos?.supplies.find((s) => s.symbol === market.collateralSymbol)
          ?.valueUsd ?? 0,
      debtUsd: pos?.borrows.at(0)?.valueUsd ?? 0,
    }
  }, [pos, market.borrowSymbol, market.collateralSymbol])

  const rows = useMemo(() => mergePositionSeries(hist), [hist])

  useEffect(() => {
    onData(market.id, { market, stat, rows })
  }, [market, stat, rows, onData])
  return null
}

/**
 * The always-present general view (R1, R2, R5, R6): total Supplied / Collateral
 * / Debt across all pools as numbers, a tabbed USD chart of the total over time
 * (Earn / Collateral / Borrow), and the asset breakdown for the active tab.
 */
export function PortfolioGeneral() {
  const { data: markets, isLoading } = useMarkets()
  const [byPool, setByPool] = useState<Record<string, PoolData>>({})
  const [metricKey, setMetricKey] = useState<MetricKey>('supply')

  const onData = useCallback((id: string, data: PoolData) => {
    setByPool((prev) => {
      const p = prev[id]
      if (id in prev && p.stat === data.stat && p.rows === data.rows)
        return prev
      return { ...prev, [id]: data }
    })
  }, [])

  if (isLoading) {
    return (
      <section className="island-shell rounded-2xl p-5">
        <LoadingCard rows={2} />
      </section>
    )
  }

  const pools = Object.values(byPool)
  const totals = sumPoolStats(pools.map((p) => p.stat))
  const aggregate = aggregateMerged(pools.map((p) => p.rows))
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]
  const contributions: Contribution[] = pools.map((p) => ({
    market: p.market,
    stat: p.stat,
  }))
  const breakdown = breakdownFor(contributions, metric)

  return (
    <section
      className="island-shell flex flex-col gap-4 rounded-2xl p-5"
      aria-label="Portfolio general"
    >
      {markets.map((market) => (
        <PoolDataCollector key={market.id} market={market} onData={onData} />
      ))}

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <StatTile
          label="Active pools"
          value={String(totals.activePools)}
          hero
        />
        <StatTile
          label="Total supplied"
          value={formatUsd(totals.suppliedUsd)}
        />
        <StatTile
          label="Total collateral"
          value={formatUsd(totals.collateralUsd)}
        />
        <StatTile
          label="Total borrowed"
          value={formatUsd(totals.debtUsd)}
          tone={totals.debtUsd > 0 ? 'negative' : 'neutral'}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4">
        <MetricTabs active={metricKey} onSelect={setMetricKey} />
        {aggregate.length === 0 ? (
          <EmptyState
            title="No history yet"
            description="Your totals over time appear here once recorded."
          />
        ) : (
          <MetricChart rows={aggregate} metric={metric} height={220} />
        )}

        {breakdown.length > 0 ? (
          <ul className="m-0 flex flex-col gap-1 p-0">
            {breakdown.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-[0.85rem]"
              >
                <span className="flex items-center gap-2">
                  <TokenGlyph
                    symbol={item.assetSymbol}
                    address={item.assetAddress}
                    size={18}
                  />
                  <span className="font-semibold text-[var(--sea-ink)]">
                    {item.assetSymbol}
                  </span>
                  <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                    {item.poolLabel}
                  </span>
                </span>
                <span className="num">{formatUsd(item.valueUsd)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
