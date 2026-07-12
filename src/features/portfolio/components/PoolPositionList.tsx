import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import type { MarketView } from '#/features/markets/types'
import { PoolPositionCard } from './PoolPositionCard'

/**
 * The user's per-pool positions (R1, R2, R3). One `PoolPositionCard` per pool
 * the user is actually in; pools with no position render nothing. When no pool
 * is active, a single empty state stands in for a blank column (AE6). Each
 * card's extra content (supply chart + protection toggle) is supplied by the
 * caller through `renderCardExtras` so this list stays composition-agnostic.
 */
export function PoolPositionList({
  renderCardExtras,
}: {
  renderCardExtras?: (market: MarketView) => ReactNode
}) {
  const { data: markets, isLoading, error } = useMarkets()
  const [resolved, setResolved] = useState<Record<string, boolean>>({})

  const report = useCallback((id: string, active: boolean) => {
    setResolved((prev) =>
      prev[id] === active ? prev : { ...prev, [id]: active },
    )
  }, [])

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState message="Could not load your positions. Try again shortly." />
    )
  }

  if (markets.length === 0) {
    return (
      <EmptyState
        title="No pools yet"
        description="Supply to an isolated pool to open a position."
      />
    )
  }

  // Only decide "empty" once every pool has reported, so the state doesn't
  // flash while cards are still loading.
  const allReported = markets.every((m) => m.id in resolved)
  const anyVisible = markets.some((m) => resolved[m.id])

  if (allReported && !anyVisible) {
    return (
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
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {markets.map((market) => (
        <PoolPositionCard key={market.id} market={market} onResolve={report}>
          {renderCardExtras?.(market)}
        </PoolPositionCard>
      ))}
    </div>
  )
}
