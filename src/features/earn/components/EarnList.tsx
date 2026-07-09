import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatPercent, formatUsd } from '#/lib/format'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { EmptyState } from '#/components/ui/states/EmptyState'
import { ConnectPrompt } from '#/components/ui/wallet/ConnectPrompt'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import type { MarketView } from '#/features/markets/types'
import { useMarketPosition } from '#/features/position/hooks/usePosition'

function StatLabel({ children }: { children: string }) {
  return (
    <span className="text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
      {children}
    </span>
  )
}

/**
 * One Earn pool row. Shows the pool's Supply APY and — for a connected wallet —
 * the user's isolated supplied-liquidity (pxUSDT) balance in this pool; when
 * disconnected the balance slot invites a connect instead of showing a zero.
 */
function EarnRow({
  market,
  isConnected,
  onConnect,
}: {
  market: MarketView
  isConnected: boolean
  onConnect?: () => void
}) {
  const { data } = useMarketPosition(market.id)
  const supplied = data?.supplies.find(
    (row) => row.symbol === market.borrowSymbol,
  )

  return (
    <article className="island-shell feature-card flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center gap-2.5">
        <TokenGlyph symbol={market.collateralSymbol} />
        <div>
          <div className="font-semibold text-[var(--sea-ink)]">
            {market.collateralSymbol}
          </div>
          <div className="text-sm text-[var(--sea-ink-soft)]">
            Supply {market.borrowSymbol} liquidity
            {market.crossChain ? ' · cross-chain' : ''}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <StatLabel>Supply APY</StatLabel>
          <span
            className="num text-[0.95rem] font-semibold"
            style={{ color: 'var(--palm)' }}
          >
            {formatPercent(market.supplyApy)}
          </span>
        </div>
        <div className="flex min-w-[9rem] flex-col gap-0.5">
          <StatLabel>Your balance</StatLabel>
          {isConnected ? (
            <span className="num text-[0.95rem] font-semibold text-[var(--sea-ink)]">
              {supplied ? formatUsd(supplied.valueUsd) : '$0.00'}
            </span>
          ) : (
            <ConnectPrompt action="see your balance" onConnect={onConnect} />
          )}
        </div>
      </div>

      <a
        href={`/earn/${market.id}`}
        className="mt-1 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold no-underline"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Supply {market.borrowSymbol}
      </a>
    </article>
  )
}

/**
 * The Earn plane list (U3, R5, R12, R15). Lists every isolated pool with its
 * Supply APY and the connected user's supplied-liquidity balance, each row
 * drilling into `/earn/:id`. Loading, error, and empty states mirror MarketList.
 */
export function EarnList() {
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
        description="Earn pools will appear here once they launch."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((market) => (
        <EarnRow
          key={market.id}
          market={market}
          isConnected={isConnected}
          onConnect={openConnectModal}
        />
      ))}
    </div>
  )
}
