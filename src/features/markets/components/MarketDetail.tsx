import { formatPercent, formatUsd } from '#/lib/format'
import { useDensity } from '#/components/density/useDensity'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { StatTile } from '#/components/ui/StatTile'
import { truncateAddress } from '#/components/ui/wallet/AccountPill'
import { HASHKEY, TOKENS } from '#/lib/contracts'
import { APYBreakdown } from './APYBreakdown'
import { MarketActions } from './MarketActions'
import type { MarketView } from '../types'

function AddressField({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
        {label}
      </span>
      <a
        href={`${HASHKEY.explorerUrl}/address/${address}`}
        target="_blank"
        rel="noreferrer"
        className="num text-[0.82rem] font-semibold text-[var(--sea-ink)] no-underline"
      >
        {truncateAddress(address)} ↗
      </a>
    </div>
  )
}

/** Market-detail surface. Hosts the action panels; Pro reveals LLTV/APR. */
export function MarketDetail({ market }: { market: MarketView }) {
  const { density } = useDensity()

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Overlapping pair logos with the market name below. */}
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
                Collateral · borrow {market.borrowSymbol}
                {market.crossChain ? ' · cross-chain' : ''}
              </p>
            </div>
          </div>

          {/* Pool + token addresses, aligned beside the identity. */}
          <div className="flex gap-6">
            <AddressField label="Pool" address={market.poolAddress} />
            <AddressField
              label={`${market.collateralSymbol} token`}
              address={market.collateralAddress}
            />
          </div>
        </div>

        <APYBreakdown base={market.supplyApy} rewards={market.rewardsApy} />

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <StatTile
            label={`${market.collateralSymbol} price`}
            value={formatUsd(market.priceUsd)}
          />
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
