import { formatPercent, formatTokenAmount, formatUsd } from '#/lib/format'
import { StatTile } from '#/components/ui/StatTile'
import { HealthMeter } from '#/components/ui/HealthMeter'
import { LiquidationPrice } from '#/components/ui/LiquidationPrice'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { usePosition } from '../hooks/usePosition'
import type { BorrowRow, SupplyRow } from '../types'

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="island-shell flex flex-col gap-2 rounded-2xl p-4">
      <h3 className="display-title m-0 text-base font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function SupplyItem({ row }: { row: SupplyRow }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-0">
      <span className="font-semibold text-[var(--sea-ink)]">{row.symbol}</span>
      <span className="flex flex-col items-end">
        <span className="num text-[0.9rem]">
          {formatTokenAmount(row.balance, row.decimals)} ·{' '}
          {formatUsd(row.valueUsd)}
        </span>
        <span className="num text-[0.72rem]" style={{ color: 'var(--palm)' }}>
          {formatPercent(row.apy)} APY
        </span>
      </span>
    </div>
  )
}

function BorrowItem({ row }: { row: BorrowRow }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-0">
      <span className="font-semibold text-[var(--sea-ink)]">{row.symbol}</span>
      <span className="flex flex-col items-end">
        <span className="num text-[0.9rem]">
          {formatTokenAmount(row.debt, row.decimals)} ·{' '}
          {formatUsd(row.valueUsd)}
        </span>
        <span className="num text-[0.72rem] text-[var(--sea-ink-soft)]">
          {formatPercent(row.apr)} APR
        </span>
      </span>
    </div>
  )
}

/** The connected user's position (U6, R9, R12, R24, R29). */
export function PositionDashboard({ empty = false }: { empty?: boolean }) {
  const { data, isLoading, error } = usePosition({ empty })

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
      <ErrorState message="Could not load your position. Try again shortly." />
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Put your assets to work"
        description="Supply an asset to start earning — it takes about a minute."
        action={
          <a
            href="/markets"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold no-underline"
            style={{ background: 'var(--palm)', color: '#f3faf5' }}
          >
            Supply an asset
          </a>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="island-shell flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl p-5">
        <StatTile label="Net worth" value={formatUsd(data.netWorthUsd)} hero />
        <StatTile
          label="Net APY"
          value={formatPercent(data.netApy)}
          tone="positive"
        />
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <HealthMeter hf={data.healthFactor} />
          {data.liquidationAsset &&
          data.currentPrice !== undefined &&
          data.liquidationPrice !== undefined ? (
            <LiquidationPrice
              asset={data.liquidationAsset}
              currentPrice={data.currentPrice}
              liquidationPrice={data.liquidationPrice}
            />
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Your supplies">
          {data.supplies.map((row) => (
            <SupplyItem key={row.symbol} row={row} />
          ))}
        </Panel>
        <Panel title="Your borrows">
          {data.borrows.map((row) => (
            <BorrowItem key={row.symbol} row={row} />
          ))}
        </Panel>
      </div>
    </div>
  )
}
