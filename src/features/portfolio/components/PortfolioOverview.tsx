import { useCallback, useEffect, useState } from 'react'
import { formatUsd } from '#/lib/format'
import { StatTile } from '#/components/ui/StatTile'
import { LoadingCard } from '#/components/ui/states/Loading'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'

/** One pool's contribution to the portfolio totals (all USD, via exchange rate). */
export interface PoolStat {
  active: boolean
  suppliedUsd: number
  collateralUsd: number
  debtUsd: number
}

export interface PortfolioTotals {
  activePools: number
  suppliedUsd: number
  collateralUsd: number
  debtUsd: number
  netUsd: number
}

/** Sum active pools only; net = supplied + collateral − debt. Pure + testable. */
export function sumPoolStats(stats: PoolStat[]): PortfolioTotals {
  const active = stats.filter((s) => s.active)
  const suppliedUsd = active.reduce((sum, s) => sum + s.suppliedUsd, 0)
  const collateralUsd = active.reduce((sum, s) => sum + s.collateralUsd, 0)
  const debtUsd = active.reduce((sum, s) => sum + s.debtUsd, 0)
  return {
    activePools: active.length,
    suppliedUsd,
    collateralUsd,
    debtUsd,
    netUsd: suppliedUsd + collateralUsd - debtUsd,
  }
}

/** Headless per-pool reader — reports one pool's USD stats up (a hook can't run
 *  in a loop). Reuses the same `useMarketPosition` cache the cards read. */
function PoolStatCollector({
  market,
  onStat,
}: {
  market: MarketView
  onStat: (id: string, stat: PoolStat) => void
}) {
  const { data } = useMarketPosition(market.id)
  const active =
    data != null && (data.supplies.length > 0 || data.borrows.length > 0)
  const collateralUsd =
    data?.supplies.find((s) => s.symbol === market.collateralSymbol)
      ?.valueUsd ?? 0
  const suppliedUsd =
    data?.supplies.find((s) => s.symbol === market.borrowSymbol)?.valueUsd ?? 0
  const debtUsd = data?.borrows.at(0)?.valueUsd ?? 0

  useEffect(() => {
    onStat(market.id, { active, suppliedUsd, collateralUsd, debtUsd })
  }, [market.id, active, suppliedUsd, collateralUsd, debtUsd, onStat])
  return null
}

/**
 * The general-first portfolio view: how many pools are active and the USD
 * totals (supplied, collateral, debt, net) across them — before any per-pool
 * detail. Totals are summed from the same per-pool reads the cards use, so the
 * headline and the breakdown never disagree.
 */
export function PortfolioOverview() {
  const { data: markets, isLoading } = useMarkets()
  const [stats, setStats] = useState<Record<string, PoolStat>>({})

  const onStat = useCallback((id: string, stat: PoolStat) => {
    setStats((prev) => {
      const prevStat = prev[id]
      const unchanged =
        id in prev &&
        prevStat.active === stat.active &&
        prevStat.suppliedUsd === stat.suppliedUsd &&
        prevStat.collateralUsd === stat.collateralUsd &&
        prevStat.debtUsd === stat.debtUsd
      return unchanged ? prev : { ...prev, [id]: stat }
    })
  }, [])

  if (isLoading) return <LoadingCard rows={1} />

  const totals = sumPoolStats(Object.values(stats))

  return (
    <section
      className="island-shell flex flex-col gap-4 rounded-2xl p-5"
      aria-label="Portfolio overview"
    >
      {markets.map((market) => (
        <PoolStatCollector key={market.id} market={market} onStat={onStat} />
      ))}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <StatTile
          label="Active pools"
          value={String(totals.activePools)}
          hero
        />
        <StatTile label="Supplied" value={formatUsd(totals.suppliedUsd)} />
        <StatTile label="Collateral" value={formatUsd(totals.collateralUsd)} />
        <StatTile
          label="Debt"
          value={formatUsd(totals.debtUsd)}
          tone={totals.debtUsd > 0 ? 'negative' : 'neutral'}
        />
        <StatTile label="Net value" value={formatUsd(totals.netUsd)} />
      </div>
    </section>
  )
}
