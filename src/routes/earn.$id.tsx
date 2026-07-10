import { createFileRoute, Link } from '@tanstack/react-router'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { getMarketConfig } from '#/lib/contracts'
import { useMarket } from '#/features/markets/hooks/useMarkets'
import { PoolInfo } from '#/features/markets/components/PoolInfo'
import { SupplyLiquidityPanel } from '#/features/supply/components/SupplyLiquidityPanel'

export const Route = createFileRoute('/earn/$id')({ component: EarnPoolPage })

function EarnPoolPage() {
  const { id } = Route.useParams()
  const config = getMarketConfig(id)
  const { data, isLoading } = useMarket(id)

  return (
    <main className="page-wrap flex flex-col gap-5 px-4 pb-12 pt-8">
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-[var(--sea-ink-soft)]"
      >
        <Link
          to="/earn"
          className="font-semibold text-[var(--sea-ink)] no-underline"
        >
          Earn
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
            to="/earn"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Earn
          </Link>
        </div>
      ) : isLoading || !data ? (
        <LoadingCard />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <PoolInfo market={data} context="earn" />
          <aside className="h-fit lg:sticky lg:top-20">
            <NetworkGuard
              title="Connect to supply"
              description="Connect a wallet to supply or withdraw pxUSDT liquidity in this pool."
            >
              <SupplyLiquidityPanel market={data} />
            </NetworkGuard>
          </aside>
        </div>
      )}
    </main>
  )
}
