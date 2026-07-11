import { formatPercent, formatUsd } from '#/lib/format'
import { TOKENS } from '#/lib/contracts'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { StatTile } from '#/components/ui/StatTile'
import { MarketIrmChart } from '#/features/analytics/components/MarketIrmChart'
import { MarketRateChart } from '#/features/analytics/components/MarketRateChart'
import type { MarketView } from '../types'
import { SizeUnavailableChip, StaleBadge } from './PoolBadges'

export type PoolInfoContext = 'earn' | 'borrow'

export interface PoolInfoProps {
  market: MarketView
  /** Reorders the metrics: Earn leads with Supply APY, Borrow with risk. */
  context: PoolInfoContext
}

/**
 * Shared, context-aware pool info + charts (U1, R4, R9, AE3). One component
 * renders the pool identity, its stat tiles, and the IRM + rate-history charts
 * that used to live on the removed `market.$id` route — so nothing is orphaned
 * by the Markets removal. It is wallet-independent: it shows pool data to any
 * visitor. The `context` prop reorders the metrics: the Earn variant leads with
 * Supply APY (borrow rate still shown); the Borrow variant leads with borrow
 * APR, LLTV, and liquidation threshold. The connected user's health lives in the
 * right-hand action card, not here.
 */
export function PoolInfo({ market, context }: PoolInfoProps) {
  return (
    <div className="flex flex-col gap-5">
      <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-col gap-2">
          <TokenPairGlyph
            collateralSymbol={market.collateralSymbol}
            borrowSymbol={market.borrowSymbol}
            collateralAddress={market.collateralAddress}
            // Every pool borrows pxUSDT today.
            borrowAddress={TOKENS.pxUSDT.address}
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
          {market.priceStale || !market.sizeKnown ? (
            <div className="flex flex-wrap items-center gap-2">
              {market.priceStale ? <StaleBadge /> : null}
              {!market.sizeKnown ? <SizeUnavailableChip /> : null}
            </div>
          ) : null}
        </div>

        {context === 'earn' ? (
          // Mockup's five-tile strip: Supply APY (hero), Utilization,
          // {collateral} price, Borrow APR, TVL. The "Available" tile is
          // dropped from Earn (KTD4) — Utilization + TVL carry the liquidity
          // signal now that the liquidity chart is gone.
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
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
              label="TVL"
              value={formatUsd(market.tvlUsd, { compact: true })}
            />
          </div>
        ) : (
          // Borrow leads with risk: Borrow APR (hero), LLTV, Liq. threshold,
          // {collateral} price, Available — same grid + tile styling as Earn,
          // its own richer tile set (KTD4).
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
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
        )}
      </section>

      <MarketIrmChart market={market} />
      <MarketRateChart market={market} />
    </div>
  )
}
