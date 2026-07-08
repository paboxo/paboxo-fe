import { useState } from 'react'
import { formatPercent, formatUsd } from '#/lib/format'
import { useDensity } from '#/components/density/useDensity'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { StatTile } from '#/components/ui/StatTile'
import { ActionPanel } from '#/components/action/ActionPanel'
import type { PreflightResult } from '#/components/action/ActionPanel'
import type { TxState } from '#/lib/tx/txState'
import { APYBreakdown } from './APYBreakdown'
import type { MarketView } from '../types'

const DEMO_CURRENT_HF = 2.41

/** Market-detail surface (U13, R7, R8). Hosts the action panel; Pro reveals LLTV/oracle/APR. */
export function MarketDetail({ market }: { market: MarketView }) {
  const { density } = useDensity()
  const [txState, setTxState] = useState<TxState>('idle')

  const preflight = (amountTokens: number): PreflightResult =>
    amountTokens * market.priceUsd <= market.availableLiquidityUsd
      ? { enabled: true }
      : { enabled: false, reason: 'Not enough liquidity in this pool.' }

  const projectHf = (amountTokens: number) =>
    Math.max(1.0, DEMO_CURRENT_HF - (amountTokens * market.priceUsd) / 4000)

  const submit = () => {
    setTxState('signing')
    window.setTimeout(() => setTxState('pending'), 400)
    window.setTimeout(() => setTxState('confirmed'), 1400)
  }

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
                label="Borrow APR"
                value={formatPercent(market.borrowApr)}
              />
              <StatTile label="Oracle" value={market.oracle} />
            </>
          ) : null}
        </div>
      </section>

      <aside className="h-fit lg:sticky lg:top-20">
        <ActionPanel
          title={`Supply ${market.collateralSymbol}`}
          idleLabel="Supply"
          symbol={market.collateralSymbol}
          decimals={market.collateralDecimals}
          priceUsd={market.priceUsd}
          maxTokens={1000}
          currentHf={DEMO_CURRENT_HF}
          projectHf={projectHf}
          preflight={preflight}
          reviewApy={market.supplyApy}
          networkFeeUsd={0.42}
          txState={txState}
          onSubmit={submit}
        />
      </aside>
    </div>
  )
}
