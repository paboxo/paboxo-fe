import { createFileRoute, Link } from '@tanstack/react-router'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import type { Address } from '#/lib/contracts'
import { usePool } from '#/features/markets/hooks/usePools'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { PoolBreadcrumb } from '#/components/layout/PoolBreadcrumb'
import { PoolInfo } from '#/features/markets/components/PoolInfo'
import { HealthMeter } from '#/components/ui/HealthMeter'
import { formatTokenAmount } from '#/lib/format'
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
  const collateralRow = position?.supplies.find(
    (row) => row.symbol === collateralSymbol,
  )
  const borrowRow = position?.borrows[0]

  return (
    <main className="page-wrap flex flex-col gap-5 px-4 pb-12 pt-8">
      <PoolBreadcrumb
        to="/borrow"
        label="Borrow"
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
          {/* Left card is wallet-independent: pool data for any visitor. */}
          <PoolInfo market={pool.market} context="borrow" />
          <aside className="h-fit lg:sticky lg:top-20">
            <NetworkGuard
              title="Connect to borrow"
              description="Connect a wallet to supply collateral, borrow, repay, or withdraw in this pool."
            >
              <div className="flex flex-col gap-3">
                {position ? (
                  <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
                    <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
                      Your position
                    </span>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--sea-ink-soft)]">
                        Collateral
                      </span>
                      <span className="num font-semibold text-[var(--sea-ink)]">
                        {collateralRow
                          ? `${formatTokenAmount(collateralRow.balance, collateralRow.decimals)} ${collateralRow.symbol}`
                          : `0 ${pool.market.collateralSymbol}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--sea-ink-soft)]">
                        Borrowed
                      </span>
                      <span className="num font-semibold text-[var(--sea-ink)]">
                        {borrowRow
                          ? `${formatTokenAmount(borrowRow.debt, borrowRow.decimals)} ${borrowRow.symbol}`
                          : `0 ${pool.market.borrowSymbol}`}
                      </span>
                    </div>
                    {position.healthFactor !== undefined ? (
                      <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-3">
                        <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
                          Health
                        </span>
                        <HealthMeter hf={position.healthFactor} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <BorrowActions
                  market={pool.market}
                  hasCollateral={hasCollateral}
                />
              </div>
            </NetworkGuard>
          </aside>
        </div>
      )}
    </main>
  )
}
