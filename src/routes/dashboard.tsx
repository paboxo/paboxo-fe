import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { PositionDashboard } from '#/features/position/components/PositionDashboard'
import { HistoryList } from '#/features/history/components/HistoryList'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader kicker="Portfolio" title="Your position" />
      <NetworkGuard description="Connect a wallet to view your supplies, borrows, and health.">
        <div className="flex flex-col gap-6">
          <PositionDashboard />
          <section className="flex flex-col gap-2">
            <h2 className="display-title m-0 text-lg font-semibold">
              Recent activity
            </h2>
            <HistoryList />
          </section>
        </div>
      </NetworkGuard>
    </main>
  )
}
