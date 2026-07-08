import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { MarketList } from '#/features/markets/components/MarketList'
import { StatsStrip } from '#/features/history/components/StatsStrip'

export const Route = createFileRoute('/markets')({ component: MarketsPage })

function MarketsPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader
        kicker="Markets"
        title="Earn and borrow"
        subtitle="Supply assets to earn, or borrow pxUSDT against them."
      />
      <StatsStrip />
      <MarketList />
    </main>
  )
}
