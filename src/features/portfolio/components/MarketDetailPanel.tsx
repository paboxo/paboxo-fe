import { useCallback, useEffect, useState } from 'react'
import { NON_FINITE, formatTokenAmount, formatUsd } from '#/lib/format'
import { HealthFactorBadge } from '#/components/ui/HealthFactorBadge'
import { StatTile } from '#/components/ui/StatTile'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { ProtectionToggle } from '#/features/protection/components/ProtectionToggle'
import type { MarketView } from '#/features/markets/types'
import { usePositionHistory } from '../hooks/usePositionHistory'
import { mergePositionSeries } from '../positionSeries'
import { METRICS } from '../metrics'
import type { MetricKey } from '../metrics'
import { MetricChart } from './MetricChart'
import { MetricTabs } from './MetricTabs'
import { MarketDropdown } from './MarketDropdown'

/** Reports whether the user is in this pool, for the dropdown options. */
function PoolActiveCollector({
  market,
  onActive,
}: {
  market: MarketView
  onActive: (id: string, active: boolean) => void
}) {
  const { data } = useMarketPosition(market.id)
  const active =
    data != null && (data.supplies.length > 0 || data.borrows.length > 0)
  useEffect(() => {
    onActive(market.id, active)
  }, [market.id, active, onActive])
  return null
}

/** One market's figures + tabbed position chart (Earn / Collateral / Borrow). */
function MarketDetailBody({ market }: { market: MarketView }) {
  const { data: pos, isLoading, error } = useMarketPosition(market.id)
  const { data: hist } = usePositionHistory(market)
  const [metricKey, setMetricKey] = useState<MetricKey>('supply')

  if (isLoading) return <LoadingCard />
  if (error) return <ErrorState message="Couldn't load this pool." />

  const collateral = pos?.supplies.find(
    (s) => s.symbol === market.collateralSymbol,
  )
  const liquidity = pos?.supplies.find((s) => s.symbol === market.borrowSymbol)
  const debt = pos?.borrows.at(0)
  const hf = pos?.healthFactor ?? Number.POSITIVE_INFINITY
  const rows = mergePositionSeries(hist)
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            label="Collateral"
            value={
              collateral
                ? formatTokenAmount(collateral.balance, collateral.decimals)
                : NON_FINITE
            }
            hint={collateral ? formatUsd(collateral.valueUsd) : undefined}
          />
          <StatTile
            label="Supplied"
            value={
              liquidity
                ? formatTokenAmount(liquidity.balance, liquidity.decimals)
                : NON_FINITE
            }
            hint={liquidity ? formatUsd(liquidity.valueUsd) : undefined}
          />
          <StatTile
            label="Debt"
            value={
              debt ? formatTokenAmount(debt.debt, debt.decimals) : NON_FINITE
            }
            hint={debt ? formatUsd(debt.valueUsd) : 'No debt'}
            tone={debt ? 'negative' : 'neutral'}
          />
        </div>
        <HealthFactorBadge hf={hf} showNote />
      </div>

      <div className="flex flex-col gap-3">
        <MetricTabs active={metricKey} onSelect={setMetricKey} />
        {rows.length === 0 ? (
          <EmptyState
            title="No history yet"
            description="This pool's supply, collateral, and debt appear here once recorded."
          />
        ) : (
          <MetricChart rows={rows} metric={metric} height={200} />
        )}
      </div>

      <div className="border-t border-[var(--line)] pt-3">
        <ProtectionToggle market={market} />
      </div>
    </div>
  )
}

/**
 * A separate market-detail card (R1, R2): a scalable dropdown of the user's
 * active markets — chosen over tabs so many markets don't overflow — and, for
 * the selected market, its figures, a tabbed position chart, and protection.
 */
export function MarketDetailPanel() {
  const { data: markets, isLoading, error } = useMarkets()
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)

  const onActive = useCallback((id: string, isActive: boolean) => {
    setActive((prev) =>
      prev[id] === isActive ? prev : { ...prev, [id]: isActive },
    )
  }, [])

  if (isLoading) return <LoadingCard />
  if (error) {
    return (
      <ErrorState message="Could not load your markets. Try again shortly." />
    )
  }

  const activeMarkets = markets.filter((m) => active[m.id])
  const allReported = markets.every((m) => m.id in active)
  const current =
    selected && activeMarkets.some((m) => m.id === selected)
      ? selected
      : activeMarkets[0]?.id
  const currentMarket = markets.find((m) => m.id === current)

  return (
    <section
      className="island-shell flex flex-col gap-4 rounded-2xl p-5"
      aria-label="Market detail"
    >
      {markets.map((market) => (
        <PoolActiveCollector
          key={market.id}
          market={market}
          onActive={onActive}
        />
      ))}

      {allReported && activeMarkets.length === 0 ? (
        <EmptyState
          title="No open positions"
          description="Supply collateral or liquidity to a pool, then track it here."
          action={
            <a
              href="/earn"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold no-underline"
              style={{ background: 'var(--palm)', color: '#f3faf5' }}
            >
              Explore pools
            </a>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="display-title m-0 text-base font-semibold">
              Market detail
            </h3>
            {activeMarkets.length > 0 && current ? (
              <MarketDropdown
                markets={activeMarkets}
                current={current}
                onSelect={setSelected}
              />
            ) : null}
          </div>

          {currentMarket ? (
            <MarketDetailBody market={currentMarket} />
          ) : (
            <LoadingCard />
          )}
        </>
      )}
    </section>
  )
}
