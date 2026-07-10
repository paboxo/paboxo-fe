import { createFileRoute, Link } from '@tanstack/react-router'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import type { Address } from '#/lib/contracts'
import { usePool } from '#/features/markets/hooks/usePools'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { PoolInfo } from '#/features/markets/components/PoolInfo'
import { BorrowActions } from '#/features/borrow/components/BorrowActions'

export const Route = createFileRoute('/borrow/$id')({
  component: BorrowPoolPage,
})

function BorrowPoolPage() {
  const { id } = Route.useParams()
  // `$id` is the pool address, resolved case-insensitively from the shared
  // query into one of four terminal states; the raw `id` never reaches a call.
  const pool = usePool(id as Address)
  const { data: position } = useMarketPosition(id)

  const collateralSymbol =
    pool.status === 'ready' ? pool.market.collateralSymbol : undefined
  const hasCollateral =
    position?.supplies.some(
      (row) => row.symbol === collateralSymbol && row.valueUsd > 0,
    ) ?? false

  return (
    <main className="page-wrap flex flex-col gap-5 px-4 pb-12 pt-8">
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-[var(--sea-ink-soft)]"
      >
        <Link
          to="/borrow"
          className="font-semibold text-[var(--sea-ink)] no-underline"
        >
          Borrow
        </Link>
        {pool.status === 'ready' ? (
          <span> / {pool.market.collateralSymbol}</span>
        ) : null}
      </nav>

      {pool.status === 'pending' ? (
        <LoadingCard />
      ) : pool.status === 'unavailable' ? (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            title="Pool unavailable"
            description="This pool is listed on the network but can’t be displayed — its token data couldn’t be verified."
          />
          <Link
            to="/borrow"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Borrow
          </Link>
        </div>
      ) : pool.status === 'not-found' ? (
        <div className="flex flex-col items-center gap-3">
          <ErrorState
            title="Pool not found"
            message="This address isn’t a pool the network returned."
          />
          <Link
            to="/borrow"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Borrow
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <PoolInfo
            market={pool.market}
            context="borrow"
            health={position?.healthFactor}
          />
          <aside className="h-fit lg:sticky lg:top-20">
            <NetworkGuard
              title="Connect to borrow"
              description="Connect a wallet to supply collateral, borrow, repay, or withdraw in this pool."
            >
              <BorrowActions market={pool.market} hasCollateral={hasCollateral} />
            </NetworkGuard>
          </aside>
        </div>
      )}
    </main>
  )
}
