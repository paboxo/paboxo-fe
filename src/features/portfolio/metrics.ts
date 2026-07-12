import type { Address } from '#/lib/contracts'
import type { MarketView } from '#/features/markets/types'
import type { PoolStat } from './totals'

/** The three position metrics, each a chart line + a totals figure. */
export type MetricKey = 'supply' | 'collateral' | 'debt'

export interface Metric {
  key: MetricKey
  /** Tab label. `supply` reads as "Earn" (lender liquidity). */
  label: string
  color: string
  statKey: keyof Pick<PoolStat, 'suppliedUsd' | 'collateralUsd' | 'debtUsd'>
}

export const METRICS: Metric[] = [
  {
    key: 'supply',
    label: 'Earn',
    color: 'var(--palm)',
    statKey: 'suppliedUsd',
  },
  {
    key: 'collateral',
    label: 'Collateral',
    color: 'var(--caution)',
    statKey: 'collateralUsd',
  },
  {
    key: 'debt',
    label: 'Borrow',
    color: 'var(--lagoon-deep)',
    statKey: 'debtUsd',
  },
]

/** One pool's current contribution to a metric, for the breakdown list. */
export interface Contribution {
  market: MarketView
  stat: PoolStat
}

export interface BreakdownItem {
  id: string
  poolLabel: string
  assetSymbol: string
  assetAddress: Address
  valueUsd: number
}

/**
 * Which assets make up a metric right now, largest first. Collateral breaks down
 * by the pool's collateral token (WETH, WBTC, …); Earn/Borrow are pxUSDT, broken
 * down by pool. Only active pools with a non-zero value appear.
 */
export function breakdownFor(
  contributions: Contribution[],
  metric: Metric,
): BreakdownItem[] {
  const isCollateral = metric.key === 'collateral'
  return contributions
    .filter((c) => c.stat.active)
    .map((c) => ({
      id: c.market.id,
      poolLabel: `${c.market.collateralSymbol} / ${c.market.borrowSymbol}`,
      assetSymbol: isCollateral
        ? c.market.collateralSymbol
        : c.market.borrowSymbol,
      assetAddress: isCollateral
        ? c.market.collateralAddress
        : c.market.borrowAddress,
      valueUsd: c.stat[metric.statKey],
    }))
    .filter((item) => item.valueUsd > 0)
    .sort((a, b) => b.valueUsd - a.valueUsd)
}
