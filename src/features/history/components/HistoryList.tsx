import { useState } from 'react'
import { HASHKEY, getMarketConfig } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ErrorState } from '#/components/ui/states/ErrorState'
import type { HistoryAction, HistoryEvent } from '#/lib/data'
import { useHistory } from '../hooks/useHistory'
import { paginate } from '../paginate'

const PAGE_SIZE = 10

const ACTION_LABEL: Record<HistoryAction, string> = {
  supply: 'Supplied',
  withdraw: 'Withdrew',
  borrow: 'Borrowed',
  repay: 'Repaid',
  liquidation: 'Liquidated',
  crosschain: 'Bridged',
}

function formatWhen(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** `pxWBTC / pxUSDT` for the event's market, or a short pool address fallback. */
function poolLabel(event: HistoryEvent): string {
  const config = getMarketConfig(event.marketId)
  if (config) return `${config.collateralSymbol} / ${config.borrowSymbol}`
  return `${event.pool.slice(0, 6)}…${event.pool.slice(-4)}`
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

function HistoryRow({ event }: { event: HistoryEvent }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
      <span className="flex flex-col">
        <span className="font-semibold text-[var(--sea-ink)]">
          {ACTION_LABEL[event.action]} {event.tokenSymbol}
        </span>
        <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
          {poolLabel(event)} · {formatWhen(event.timestamp)}
        </span>
      </span>
      <span className="flex flex-col items-end">
        <span className="num text-[0.9rem]">
          {formatTokenAmount(event.amount, event.decimals)} {event.tokenSymbol}
        </span>
        <a
          href={`${HASHKEY.explorerUrl}/tx/${event.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="num text-[0.72rem] font-semibold underline"
          style={{ color: 'var(--palm)' }}
        >
          {shortHash(event.txHash)}
        </a>
      </span>
    </div>
  )
}

/** Transaction history from the indexer, newest first, paginated (U8). */
export function HistoryList({ address }: { address?: Address }) {
  const { data, isLoading, error } = useHistory(address)
  const [page, setPage] = useState(1)

  if (isLoading) return <LoadingCard />
  if (error) {
    return (
      <ErrorState message="Live history is temporarily unavailable — your balances still work." />
    )
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Your supplies, borrows, and repayments will show up here."
      />
    )
  }

  const { items, page: current, pageCount } = paginate(data, page, PAGE_SIZE)

  return (
    <section
      className="island-shell flex flex-col gap-1 rounded-2xl p-4"
      aria-label="Transaction history"
    >
      {items.map((event) => (
        <HistoryRow key={event.id} event={event} />
      ))}

      {pageCount > 1 ? (
        <div className="mt-2 flex items-center justify-between gap-3 text-[0.8rem]">
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            disabled={current <= 1}
            className="rounded-lg px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ border: '1px solid var(--line)' }}
          >
            Previous
          </button>
          <span className="text-[var(--sea-ink-soft)]">
            Page {current} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={current >= pageCount}
            className="rounded-lg px-3 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{ border: '1px solid var(--line)' }}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
