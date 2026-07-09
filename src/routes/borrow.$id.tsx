import { createFileRoute, Link } from '@tanstack/react-router'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { getMarketConfig } from '#/lib/contracts'
import { useMarket } from '#/features/markets/hooks/useMarkets'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { PoolInfo } from '#/features/markets/components/PoolInfo'
import { BorrowActions } from '#/features/borrow/components/BorrowActions'

export const Route = createFileRoute('/borrow/$id')({
  component: BorrowPoolPage,
})

function BorrowPoolPage() {
  const { id } = Route.useParams()
  const config = getMarketConfig(id)
  const { data, isLoading } = useMarket(id)
  const { data: position } = useMarketPosition(id)

  const hasCollateral =
    position?.supplies.some(
      (row) => row.symbol === config?.collateralSymbol && row.valueUsd > 0,
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
        {config ? <span> / {config.collateralSymbol}</span> : null}
      </nav>

      {!config ? (
        <div className="flex flex-col items-center gap-3">
          <ErrorState
            title="Pool not found"
            message="This pool doesn’t exist or hasn’t launched yet."
          />
          <Link
            to="/borrow"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Borrow
          </Link>
        </div>
      ) : isLoading || !data ? (
        <LoadingCard />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <PoolInfo
            market={data}
            context="borrow"
            health={position?.healthFactor}
          />
          <aside className="h-fit lg:sticky lg:top-20">
            <NetworkGuard
              title="Connect to borrow"
              description="Connect a wallet to supply collateral, borrow, repay, or withdraw in this pool."
            >
              <BorrowActions market={data} hasCollateral={hasCollateral} />
            </NetworkGuard>
          </aside>
        </div>
      )}
    </main>
  )
}
