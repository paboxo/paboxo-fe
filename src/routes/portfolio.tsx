import { createFileRoute } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { PortfolioGeneral } from '#/features/portfolio/components/PortfolioGeneral'
import { MarketDetailPanel } from '#/features/portfolio/components/MarketDetailPanel'
import { TrustNote } from '#/features/portfolio/components/TrustNote'
import { ProtectAllButton } from '#/features/protection/components/ProtectAllButton'
import { AgentActivityFeed } from '#/features/protection/components/AgentActivityFeed'
import { HistoryList } from '#/features/history/components/HistoryList'

export const Route = createFileRoute('/portfolio')({ component: PortfolioPage })

function PortfolioPage() {
  const { address } = useAccount()
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader kicker="Portfolio" title="Your position" />
      <NetworkGuard description="Connect a wallet to view your supplies, borrows, and health.">
        <div className="flex flex-col gap-6">
          <PortfolioGeneral />
          <ProtectAllButton />
          <MarketDetailPanel />
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
