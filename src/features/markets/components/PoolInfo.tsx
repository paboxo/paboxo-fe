import { formatPercent, formatUsd } from '#/lib/format'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { StatTile } from '#/components/ui/StatTile'
import { HealthMeter } from '#/components/ui/HealthMeter'
import { MarketIrmChart } from '#/features/analytics/components/MarketIrmChart'
import { MarketRateChart } from '#/features/analytics/components/MarketRateChart'
import type { MarketView } from '../types'

export type PoolInfoContext = 'earn' | 'borrow'

export interface PoolInfoProps {
  market: MarketView
  /** Reorders the metrics: Earn leads with Supply APY, Borrow with risk. */
  context: PoolInfoContext
  /** The connected user's health for this pool — the Borrow variant leads with it. */
  health?: number
}

/**
 * Shared, context-aware pool info + charts (U1, R4, R9, AE3). One component
 * renders the pool identity, its stat tiles, and the IRM + rate-history charts
 * that used to live on the removed `market.$id` route — so nothing is orphaned
 * by the Markets removal. The `context` prop reorders the metrics: the Earn
 * variant leads with Supply APY (borrow rate still shown); the Borrow variant
 * leads with borrow APR, LLTV, liquidation threshold, and the user's health.
 */
export function PoolInfo({ market, context, health }: PoolInfoProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-col gap-2">
          <TokenPairGlyph
            collateralSymbol={market.collateralSymbol}
            borrowSymbol={market.borrowSymbol}
            size={38}
          />
          <div>
            <h2 className="display-title m-0 text-2xl font-semibold text-[var(--sea-ink)]">
              {market.collateralSymbol}
              <span className="text-[var(--sea-ink-soft)]">
                {' / '}
                {market.borrowSymbol}
              </span>
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              {context === 'earn'
                ? `Supply ${market.borrowSymbol} liquidity for this pool's APY`
                : `Borrow ${market.borrowSymbol} against ${market.collateralSymbol}`}
              {market.crossChain ? ' · cross-chain' : ''}
            </p>
          </div>
        </div>

        {context === 'earn' ? (
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <StatTile
              label="Supply APY"
              value={formatPercent(market.supplyApy)}
              tone="positive"
              hero
            />
            <StatTile
              label="Utilization"
              value={formatPercent(market.utilization)}
            />
            <StatTile
              label={`${market.collateralSymbol} price`}
              value={formatUsd(market.priceUsd)}
            />
            <StatTile
              label="Borrow APR"
              value={formatPercent(market.borrowApr)}
            />
            <StatTile
              label="Available"
              value={formatUsd(market.availableLiquidityUsd, { compact: true })}
            />
            <StatTile
              label="TVL"
              value={formatUsd(market.tvlUsd, { compact: true })}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <StatTile
                label="Borrow APR"
                value={formatPercent(market.borrowApr)}
                hero
              />
              <StatTile label="LLTV" value={formatPercent(market.lltv)} />
              <StatTile
                label="Liq. threshold"
                value={formatPercent(market.liqThreshold)}
              />
              <StatTile
                label={`${market.collateralSymbol} price`}
                value={formatUsd(market.priceUsd)}
              />
              <StatTile
                label="Available"
                value={formatUsd(market.availableLiquidityUsd, {
                  compact: true,
                })}
              />
            </div>
            {health !== undefined ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
                  Your health
                </span>
                <HealthMeter hf={health} />
              </div>
            ) : null}
          </div>
        )}
      </section>

      <MarketIrmChart market={market} />
      <MarketRateChart market={market} />
    </div>
  )
}
