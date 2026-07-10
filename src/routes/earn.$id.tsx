import { createFileRoute, Link } from '@tanstack/react-router'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import type { Address } from '#/lib/contracts'
import { usePool } from '#/features/markets/hooks/usePools'
import { PoolBreadcrumb } from '#/components/layout/PoolBreadcrumb'
import { PoolInfo } from '#/features/markets/components/PoolInfo'
import { SupplyLiquidityPanel } from '#/features/supply/components/SupplyLiquidityPanel'

export const Route = createFileRoute('/earn/$id')({ component: EarnPoolPage })

function EarnPoolPage() {
  const { id } = Route.useParams()
  // `$id` is the pool address. `usePool` matches it case-insensitively against
  // the same query the list uses (no second fetch) and returns one of four
  // terminal states; the raw `id` never reaches a contract call.
  const pool = usePool(id as Address)

  return (
    <main className="page-wrap flex flex-col gap-5 px-4 pb-12 pt-8">
      <PoolBreadcrumb
        to="/earn"
        label="Earn"
        current={
          pool.status === 'ready'
            ? `${pool.market.collateralSymbol} · ${pool.market.borrowSymbol}`
            : undefined
        }
      />

      {pool.status === 'pending' ? (
        <LoadingCard />
      ) : pool.status === 'unavailable' ? (
        <div className="flex flex-col items-center gap-3">
          <EmptyState
            title="Pool unavailable"
            description="This pool is listed on the network but can’t be displayed — its token data couldn’t be verified."
          />
          <Link
            to="/earn"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Earn
          </Link>
        </div>
      ) : pool.status === 'not-found' ? (
        <div className="flex flex-col items-center gap-3">
          <ErrorState
            title="Pool not found"
            message="This address isn’t a pool the network returned."
          />
          <Link
            to="/earn"
            className="text-sm font-bold text-[var(--sea-ink)] no-underline"
          >
            ← Back to Earn
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <PoolInfo market={pool.market} context="earn" />
          <aside className="h-fit lg:sticky lg:top-20">
            <NetworkGuard
              title="Connect to supply"
              description="Connect a wallet to supply or withdraw pxUSDT liquidity in this pool."
            >
              <SupplyLiquidityPanel market={pool.market} />
            </NetworkGuard>
          </aside>
        </div>
      )}
    </main>
  )
}
