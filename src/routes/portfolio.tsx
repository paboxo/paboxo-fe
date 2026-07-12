import { createFileRoute } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { PortfolioOverview } from '#/features/portfolio/components/PortfolioOverview'
import { AggregatePositionChart } from '#/features/portfolio/components/AggregatePositionChart'
import { PoolSelector } from '#/features/portfolio/components/PoolSelector'
import { PositionHistoryChart } from '#/features/portfolio/components/PositionHistoryChart'
import { TrustNote } from '#/features/portfolio/components/TrustNote'
import { ProtectAllButton } from '#/features/protection/components/ProtectAllButton'
import { ProtectionToggle } from '#/features/protection/components/ProtectionToggle'
import { AgentActivityFeed } from '#/features/protection/components/AgentActivityFeed'
import { HistoryList } from '#/features/history/components/HistoryList'
import type { MarketView } from '#/features/markets/types'

export const Route = createFileRoute('/portfolio')({ component: PortfolioPage })

// The selected pool card gets its position chart and a free protection toggle,
// composed in through the selector's `renderCardExtras` slot.
function cardExtras(market: MarketView) {
  return (
    <>
      <PositionHistoryChart market={market} />
      <ProtectionToggle market={market} />
    </>
  )
}

function PortfolioPage() {
  const { address } = useAccount()
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader kicker="Portfolio" title="Your position" />
      <NetworkGuard description="Connect a wallet to view your supplies, borrows, and health.">
        <div className="flex flex-col gap-6">
          <PortfolioOverview />
          <AggregatePositionChart />
          <ProtectAllButton />
          <PoolSelector renderCardExtras={cardExtras} />
          <AgentActivityFeed user={address} />
          <TrustNote />
          <section className="flex flex-col gap-2">
            <h2 className="display-title m-0 text-lg font-semibold">
              Recent activity
            </h2>
            <HistoryList address={address} />
          </section>
        </div>
      </NetworkGuard>
    </main>
  )
}
