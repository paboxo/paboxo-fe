import { formatTokenAmount } from '#/lib/format'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ErrorState } from '#/components/ui/states/ErrorState'
import type { HistoryAction, HistoryEvent } from '#/lib/data'
import { useHistory } from '../hooks/useHistory'

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
  })
}

function HistoryRow({ event }: { event: HistoryEvent }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-0">
      <span className="flex flex-col">
        <span className="font-semibold text-[var(--sea-ink)]">
          {ACTION_LABEL[event.action]} {event.tokenSymbol}
        </span>
        <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
          {formatWhen(event.timestamp)}
        </span>
      </span>
      <span className="num text-[0.9rem]">
        {formatTokenAmount(event.amount, event.decimals)} {event.tokenSymbol}
      </span>
    </div>
  )
}

/** Transaction history from the indexer adapter (U8). */
export function HistoryList() {
  const { data, isLoading, error } = useHistory()

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

  return (
    <section
      className="island-shell flex flex-col gap-1 rounded-2xl p-4"
      aria-label="Transaction history"
    >
      {data.map((event) => (
        <HistoryRow key={event.id} event={event} />
      ))}
    </section>
  )
}
