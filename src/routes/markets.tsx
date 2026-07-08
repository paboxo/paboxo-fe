import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { MarketList } from '#/features/markets/components/MarketList'

export const Route = createFileRoute('/markets')({ component: MarketsPage })

function MarketsPage() {
  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <AppPageHeader
        kicker="Markets"
        title="Earn and borrow"
        subtitle="Supply assets to earn, or borrow pxUSDT against them."
      />
      <MarketList />
    </main>
  )
}
