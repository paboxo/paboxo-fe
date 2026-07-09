import { useDensity } from '#/components/density/useDensity'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '../hooks/useMarkets'
import { MarketCard } from './MarketCard'
import { MarketRow } from './MarketRow'

/** The markets plane (U11, R6, R8). Simple → cards, Pro → one dense glass table. */
export function MarketList() {
  const { density } = useDensity()
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
    return <ErrorState message="Could not load markets. Try again shortly." />
  }
  if (data.length === 0) {
    return <EmptyState title="No markets yet" description="Check back soon." />
  }

  if (density === 'pro') {
    return (
      <>
        {/* Below ~640px the dense table becomes stacked cards (R28). */}
        <div className="grid gap-4 sm:hidden">
          {data.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
        <div className="island-shell hidden overflow-x-auto rounded-2xl sm:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[0.68rem] uppercase tracking-[0.07em] text-[var(--sea-ink-soft)]">
                <th className="px-4 py-3 text-left font-bold">Market</th>
                <th className="px-4 py-3 text-right font-bold">Price</th>
                <th className="px-4 py-3 text-right font-bold">Supply APY</th>
                <th className="px-4 py-3 text-right font-bold">Borrow APR</th>
                <th className="px-4 py-3 text-right font-bold">Utilization</th>
                <th className="px-4 py-3 text-right font-bold">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {data.map((market) => (
                <MarketRow key={market.id} market={market} />
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
