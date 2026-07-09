import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ConnectPrompt } from '#/components/ui/wallet/ConnectPrompt'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import type { MarketView } from '#/features/markets/types'
import { useMarketPosition } from '#/features/position/hooks/usePosition'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
        {label}
      </span>
      <span className="num text-[0.95rem] font-semibold text-[var(--sea-ink)]">
        {value}
      </span>
    </div>
  )
}

/**
 * One Borrow pool row. For a connected wallet it shows the user's isolated
 * collateral, debt, and health in this pool; disconnected, the position slot
 * invites a connect instead of showing zeroes.
 */
function BorrowRow({
  market,
  isConnected,
  onConnect,
}: {
  market: MarketView
  isConnected: boolean
  onConnect?: () => void
}) {
  const { data } = useMarketPosition(market.id)
  const collateral = data?.supplies.find(
    (row) => row.symbol === market.collateralSymbol,
  )
  const debt = data?.borrows.find((row) => row.symbol === market.borrowSymbol)
  const health = data?.healthFactor

  return (
    <article className="island-shell feature-card flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center gap-2.5">
        <TokenGlyph symbol={market.collateralSymbol} />
        <div>
          <div className="font-semibold text-[var(--sea-ink)]">
            {market.collateralSymbol}
          </div>
          <div className="text-sm text-[var(--sea-ink-soft)]">
            Borrow {market.borrowSymbol} against {market.collateralSymbol}
            {market.crossChain ? ' · cross-chain' : ''}
          </div>
        </div>
      </div>

      {isConnected ? (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Stat
            label="Your collateral"
            value={collateral ? formatUsd(collateral.valueUsd) : '$0.00'}
          />
          <Stat
            label="Your debt"
            value={debt ? formatUsd(debt.valueUsd) : '$0.00'}
          />
          <Stat
            label="Health"
            value={health !== undefined ? health.toFixed(2) : '—'}
          />
        </div>
      ) : (
        <ConnectPrompt action="see your position" onConnect={onConnect} />
      )}

      <a
        href={`/borrow/${market.id}`}
        className="mt-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold no-underline"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Manage position
      </a>
    </article>
  )
}

/**
 * The Borrow plane list (U4, R7, R12, R15). Lists every isolated pool with the
 * connected user's collateral, debt, and health, each row drilling into
 * `/borrow/:id`. Loading, error, and empty states mirror MarketList.
 */
export function BorrowList() {
  const { data, isLoading, error } = useMarkets()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }
  if (error) {
    return <ErrorState message="Could not load pools. Try again shortly." />
  }
  if (data.length === 0) {
    return (
      <EmptyState
        title="No pools yet"
        description="Borrow pools will appear here once they launch."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((market) => (
        <BorrowRow
          key={market.id}
          market={market}
          isConnected={isConnected}
          onConnect={openConnectModal}
        />
      ))}
    </div>
  )
}
