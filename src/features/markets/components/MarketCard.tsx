import { formatUsd } from '#/lib/format'
import { APYValue } from '#/components/ui/APYValue'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import type { MarketView } from '../types'

/** Simple-density market card (U11): APY as the hero, one primary action. */
export function MarketCard({ market }: { market: MarketView }) {
  return (
    <article className="island-shell feature-card flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center gap-2.5">
        <TokenGlyph symbol={market.collateralSymbol} />
        <div>
          <div className="font-semibold text-[var(--sea-ink)]">
            {market.collateralSymbol}
          </div>
          <div className="text-sm text-[var(--sea-ink-soft)]">
            Supply · earn {market.borrowSymbol}
            {market.crossChain ? ' · cross-chain' : ''}
          </div>
        </div>
      </div>

      <APYValue apy={market.supplyApy} rewards={market.rewardsApy} size="lg" />

      <div className="text-sm text-[var(--sea-ink-soft)]">
        Supply APY ·{' '}
        <span className="num">
          {formatUsd(market.tvlUsd, { compact: true })}
        </span>{' '}
        supplied
      </div>

      <a
        href={`/market/${market.id}`}
        className="mt-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold no-underline"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Supply
      </a>
    </article>
  )
}
