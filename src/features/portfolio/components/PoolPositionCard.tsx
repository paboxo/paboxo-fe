import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NON_FINITE, formatTokenAmount, formatUsd } from '#/lib/format'
import { HealthFactorBadge } from '#/components/ui/HealthFactorBadge'
import { StatTile } from '#/components/ui/StatTile'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { ChevronIcon } from '#/components/icons/ChevronIcon'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'

/** Collapsible details (supply chart + protection). Content mounts only when
 *  open so the recharts container measures a real width instead of zero. */
function CardDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-[var(--line)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-[0.8rem] font-semibold text-[var(--sea-ink-soft)]"
      >
        {open ? 'Hide details' : 'Supply chart & protection'}
        <span
          className="motion-safe:transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <ChevronIcon size={16} />
        </span>
      </button>
      {open ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
    </div>
  )
}

/**
 * One isolated pool's position (R1, R2, R3): collateral, supplied liquidity,
 * debt, and the agent HF zone — scoped to the pool, never aggregated. Renders
 * `null` for a pool the user isn't in, and reports that up via `onResolve` so
 * the list can show a single empty state instead of a blank column. A no-debt
 * pool reads as a healthy HF (∞). Extra content (supply chart, protection
 * toggle) is composed in through `children`.
 */
export function PoolPositionCard({
  market,
  onResolve,
  children,
}: {
  market: MarketView
  onResolve?: (id: string, active: boolean) => void
  children?: ReactNode
}) {
  const { data, isLoading, error } = useMarketPosition(market.id)

  const active =
    data != null && (data.supplies.length > 0 || data.borrows.length > 0)

  // Report whether this card shows anything (a real position or an error card);
  // only a genuinely empty pool reports false, so the list's empty state fires
  // solely when every pool is empty — never masking a per-pool error.
  useEffect(() => {
    if (isLoading) return
    onResolve?.(market.id, Boolean(error) || active)
  }, [market.id, isLoading, error, active, onResolve])

  if (isLoading) return <LoadingCard />
  if (error)
    return <ErrorState message="Couldn't load this pool. Try again shortly." />
  if (!data || !active) return null

  const collateral = data.supplies.find(
    (s) => s.symbol === market.collateralSymbol,
  )
  const liquidity = data.supplies.find((s) => s.symbol === market.borrowSymbol)
  const debt = data.borrows.at(0)
  const hf = data.healthFactor ?? Number.POSITIVE_INFINITY

  return (
    <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TokenPairGlyph
            collateralSymbol={market.collateralSymbol}
            borrowSymbol={market.borrowSymbol}
            collateralAddress={market.collateralAddress}
            borrowAddress={market.borrowAddress}
            size={26}
          />
          <h3 className="display-title m-0 text-base font-semibold">
            {market.collateralSymbol} / {market.borrowSymbol}
          </h3>
        </div>
        <HealthFactorBadge hf={hf} showNote />
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Collateral"
          value={
            collateral
              ? formatTokenAmount(collateral.balance, collateral.decimals)
              : NON_FINITE
          }
          hint={collateral ? formatUsd(collateral.valueUsd) : undefined}
        />
        <StatTile
          label="Supplied"
          value={
            liquidity
              ? formatTokenAmount(liquidity.balance, liquidity.decimals)
              : NON_FINITE
          }
          hint={liquidity ? formatUsd(liquidity.valueUsd) : undefined}
        />
        <StatTile
          label="Debt"
          value={
            debt ? formatTokenAmount(debt.debt, debt.decimals) : NON_FINITE
          }
          hint={debt ? formatUsd(debt.valueUsd) : 'No debt'}
          tone={debt ? 'negative' : 'neutral'}
        />
      </div>

      {children ? <CardDetails>{children}</CardDetails> : null}
    </section>
  )
}
