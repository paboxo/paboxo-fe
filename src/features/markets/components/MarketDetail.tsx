import { formatPercent, formatUsd } from '#/lib/format'
import { useDensity } from '#/components/density/useDensity'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { StatTile } from '#/components/ui/StatTile'
import { APYBreakdown } from './APYBreakdown'
import { MarketActions } from './MarketActions'
import type { MarketView } from '../types'

/** Market-detail surface (U20, R7, R8). Hosts the action panels; Pro reveals LLTV/oracle/APR. */
export function MarketDetail({ market }: { market: MarketView }) {
  const { density } = useDensity()

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <TokenGlyph symbol={market.collateralSymbol} size={34} />
          <div>
            <h2 className="display-title m-0 text-2xl font-semibold text-[var(--sea-ink)]">
              {market.collateralSymbol}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
              Collateral · borrow {market.borrowSymbol}
              {market.crossChain ? ' · cross-chain' : ''}
            </p>
          </div>
        </div>

        <APYBreakdown base={market.supplyApy} rewards={market.rewardsApy} />

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <StatTile
            label="Utilization"
            value={formatPercent(market.utilization)}
          />
          <StatTile
            label="TVL"
            value={formatUsd(market.tvlUsd, { compact: true })}
          />
          <StatTile
            label="Available"
            value={formatUsd(market.availableLiquidityUsd, { compact: true })}
          />
          {density === 'pro' ? (
            <>
              <StatTile label="LLTV" value={formatPercent(market.lltv)} />
              <StatTile
                label="Liq. threshold"
                value={formatPercent(market.liqThreshold)}
              />
              <StatTile
                label="Borrow APR"
                value={formatPercent(market.borrowApr)}
              />
              <StatTile label="Oracle" value={market.oracle} />
            </>
          ) : null}
        </div>
      </section>

      <aside className="h-fit lg:sticky lg:top-20">
        <MarketActions market={market} />
      </aside>
    </div>
  )
}
