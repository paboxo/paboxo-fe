import { formatPercent, formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import type { MarketView } from '#/features/markets/types'

/** One Borrow pool row — pool-level metrics only; the user's position lives on
 *  the per-pool page, so the list needs no wallet connection. */
function BorrowRow({ market }: { market: MarketView }) {
  return (
    <tr className="border-b border-[var(--line)] last:border-0 hover:bg-[color-mix(in_oklab,var(--lagoon)_8%,transparent)]">
      <td className="px-4 py-3">
        <a
          href={`/borrow/${market.id}`}
          className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
        >
          <TokenGlyph symbol={market.collateralSymbol} size={20} />
          {market.collateralSymbol}
        </a>
      </td>
      <td className="num px-4 py-3 text-right">
        {formatUsd(market.tvlUsd, { compact: true })}
      </td>
      <td
        className="num px-4 py-3 text-right font-semibold"
        style={{ color: 'var(--danger)' }}
      >
        {formatPercent(market.borrowApr)}
      </td>
      <td className="num px-4 py-3 text-right">{formatPercent(market.lltv)}</td>
      <td className="num px-4 py-3 text-right">
        {formatPercent(market.liqThreshold)}
      </td>
      <td className="num px-4 py-3 text-right">
        {formatUsd(market.availableLiquidityUsd, { compact: true })}
      </td>
    </tr>
  )
}

/**
 * The Borrow plane list (U4, R7). A table of every isolated pool with its
 * pool-level metrics — total supply, borrow APR, LTV, liquidation threshold,
 * liquidity — each row drilling into `/borrow/:id`. No wallet needed to browse.
 */
export function BorrowList() {
  const { data, isLoading, error } = useMarkets()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }
  if (error) {
    return <ErrorState message="Could not load pools. Try again shortly." />
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="No pools yet"
        description="Borrow pools will appear here once they launch."
      />
    )
  }

  return (
    <div className="island-shell overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--sea-ink-soft)]">
            <th className="px-4 py-3 text-left font-bold">Pool</th>
            <th className="px-4 py-3 text-right font-bold">Total supply</th>
            <th className="px-4 py-3 text-right font-bold">Borrow APR</th>
            <th className="px-4 py-3 text-right font-bold">LTV</th>
            <th className="px-4 py-3 text-right font-bold">Liq. threshold</th>
            <th className="px-4 py-3 text-right font-bold">Liquidity</th>
          </tr>
        </thead>
        <tbody>
          {data.map((market) => (
            <BorrowRow key={market.id} market={market} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
