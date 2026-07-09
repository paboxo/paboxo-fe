import { formatPercent, formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import type { MarketView } from '../types'

/** Pro-density market row (U11): one dense glass table, mono numerals, APY led in palm. */
export function MarketRow({ market }: { market: MarketView }) {
  return (
    <tr className="border-b border-[var(--line)] last:border-0 hover:bg-[color-mix(in_oklab,var(--lagoon)_8%,transparent)]">
      <td className="px-4 py-3">
        <a
          href={`/market/${market.id}`}
          className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
        >
          <TokenGlyph symbol={market.collateralSymbol} size={20} />
          {market.collateralSymbol}
        </a>
      </td>
      <td className="num px-4 py-3 text-right">
        {formatUsd(market.priceUsd)}
      </td>
      <td
        className="num px-4 py-3 text-right font-semibold"
        style={{ color: 'var(--palm)' }}
      >
        {formatPercent(market.supplyApy)}
      </td>
      <td className="num px-4 py-3 text-right">
        {formatPercent(market.borrowApr)}
      </td>
      <td className="num px-4 py-3 text-right">
        {formatPercent(market.utilization)}
      </td>
      <td className="num px-4 py-3 text-right">
        {formatUsd(market.availableLiquidityUsd, { compact: true })}
      </td>
    </tr>
  )
}
