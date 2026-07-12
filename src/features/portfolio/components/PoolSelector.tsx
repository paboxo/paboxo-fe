import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'
import { PoolPositionCard } from './PoolPositionCard'

/** Headless reader — reports whether the user is in this pool (for the tabs). */
function PoolActiveCollector({
  market,
  onActive,
}: {
  market: MarketView
  onActive: (id: string, active: boolean) => void
}) {
  const { data } = useMarketPosition(market.id)
  const active =
    data != null && (data.supplies.length > 0 || data.borrows.length > 0)
  useEffect(() => {
    onActive(market.id, active)
  }, [market.id, active, onActive])
  return null
}

/**
 * A pool picker instead of a wall of cards (R1, R2): the user's active pools
 * are tabs; selecting one shows just that pool's detail (figures + position
 * chart + protection), expanded. Keeps a single empty state when none are open.
 */
export function PoolSelector({
  renderCardExtras,
}: {
  renderCardExtras?: (market: MarketView) => ReactNode
}) {
  const { data: markets, isLoading, error } = useMarkets()
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<string | null>(null)

  const onActive = useCallback((id: string, isActive: boolean) => {
    setActive((prev) =>
      prev[id] === isActive ? prev : { ...prev, [id]: isActive },
    )
  }, [])

  if (isLoading) return <LoadingCard />
  if (error) {
    return (
      <ErrorState message="Could not load your positions. Try again shortly." />
    )
  }

  const activeMarkets = markets.filter((m) => active[m.id])
  const allReported = markets.every((m) => m.id in active)
  const current =
    selected && activeMarkets.some((m) => m.id === selected)
      ? selected
      : activeMarkets[0]?.id
  const currentMarket = markets.find((m) => m.id === current)

  return (
    <div className="flex flex-col gap-4">
      {markets.map((market) => (
        <PoolActiveCollector
          key={market.id}
          market={market}
          onActive={onActive}
        />
      ))}

      {allReported && activeMarkets.length === 0 ? (
        <EmptyState
          title="No open positions"
          description="Supply collateral or liquidity to a pool, then track it here."
          action={
            <a
              href="/earn"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold no-underline"
              style={{ background: 'var(--palm)', color: '#f3faf5' }}
            >
              Explore pools
            </a>
          }
        />
      ) : (
        <>
          {activeMarkets.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Your pools"
            >
              {activeMarkets.map((market) => {
                const isCurrent = market.id === current
                return (
                  <button
                    key={market.id}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    onClick={() => setSelected(market.id)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors"
                    style={{
                      border: '1px solid var(--line)',
                      background: isCurrent
                        ? 'var(--surface-strong)'
                        : 'transparent',
                      color: isCurrent
                        ? 'var(--sea-ink)'
                        : 'var(--sea-ink-soft)',
                    }}
                  >
                    <TokenPairGlyph
                      collateralSymbol={market.collateralSymbol}
                      borrowSymbol={market.borrowSymbol}
                      collateralAddress={market.collateralAddress}
                      borrowAddress={market.borrowAddress}
                      size={18}
                    />
                    {market.collateralSymbol} / {market.borrowSymbol}
                  </button>
                )
              })}
            </div>
          ) : null}

          {currentMarket ? (
            <PoolPositionCard market={currentMarket} detailsOpen>
              {renderCardExtras?.(currentMarket)}
            </PoolPositionCard>
          ) : (
            <LoadingCard />
          )}
        </>
      )}
    </div>
  )
}
