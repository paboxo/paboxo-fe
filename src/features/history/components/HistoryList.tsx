import { useState } from 'react'
import { HASHKEY, TOKENS, getMarketConfig } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { formatTokenAmount } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { TokenPairGlyph } from '#/components/ui/TokenPairGlyph'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ErrorState } from '#/components/ui/states/ErrorState'
import type { HistoryAction, HistoryEvent } from '#/lib/data'
import { useHistory } from '../hooks/useHistory'
import { paginate } from '../paginate'

const PAGE_SIZE = 10
const BORROW_ADDRESS = TOKENS.pxUSDT.address

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

interface PoolMeta {
  label: string
  collateralSymbol: string
  borrowSymbol: string
  collateralAddress: Address
}

/** Pool identity for the event's market, or `null` when the id is unknown. */
function poolMeta(event: HistoryEvent): PoolMeta | null {
  const config = getMarketConfig(event.marketId)
  if (!config) return null
  return {
    label: `${config.collateralSymbol} / ${config.borrowSymbol}`,
    collateralSymbol: config.collateralSymbol,
    borrowSymbol: config.borrowSymbol,
    collateralAddress: config.collateralAddress,
  }
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

const TH =
  'px-3 py-2 text-left text-[0.66rem] font-bold uppercase tracking-[0.06em] text-[var(--sea-ink-soft)]'
const TD = 'px-3 py-2.5 align-middle'

function HistoryRow({ event }: { event: HistoryEvent }) {
  const meta = poolMeta(event)
  return (
    <tr className="border-t border-[var(--line)]">
      <td className={TD}>
        {meta ? (
          <span className="flex items-center gap-2 whitespace-nowrap font-semibold text-[var(--sea-ink)]">
            <TokenPairGlyph
              collateralSymbol={meta.collateralSymbol}
              borrowSymbol={meta.borrowSymbol}
              collateralAddress={meta.collateralAddress}
              borrowAddress={BORROW_ADDRESS}
              size={20}
            />
            {meta.label}
          </span>
        ) : (
          <span className="num text-[var(--sea-ink-soft)]">
            {shortHash(event.pool)}
          </span>
        )}
      </td>
      <td
        className={`${TD} whitespace-nowrap font-semibold text-[var(--sea-ink)]`}
      >
        {ACTION_LABEL[event.action]}
      </td>
      <td className={`${TD} text-right`}>
        <span className="num inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
          <TokenGlyph
            symbol={event.tokenSymbol}
            address={event.token}
            size={18}
          />
          {formatTokenAmount(event.amount, event.decimals)} {event.tokenSymbol}
        </span>
      </td>
      <td
        className={`${TD} whitespace-nowrap text-[0.8rem] text-[var(--sea-ink-soft)]`}
      >
        {formatWhen(event.timestamp)}
      </td>
      <td className={`${TD} text-right`}>
        <a
          href={`${HASHKEY.explorerUrl}/tx/${event.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="num text-[0.8rem] font-semibold underline"
          style={{ color: 'var(--palm)' }}
        >
          {shortHash(event.txHash)}
        </a>
      </td>
    </tr>
  )
}

/** Transaction history from the indexer, newest first, as a paginated table (U8). */
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
      className="island-shell flex flex-col gap-3 rounded-2xl p-4"
      aria-label="Transaction history"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.9rem]">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                Pool
              </th>
              <th scope="col" className={TH}>
                Action
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Amount
              </th>
              <th scope="col" className={TH}>
                Date
              </th>
              <th scope="col" className={`${TH} text-right`}>
                Tx
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((event) => (
              <HistoryRow key={event.id} event={event} />
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 text-[0.8rem]">
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
