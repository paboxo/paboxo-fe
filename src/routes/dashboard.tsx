import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { PositionDashboard } from '#/features/position/components/PositionDashboard'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <AppPageHeader kicker="Portfolio" title="Your position" />
      <NetworkGuard description="Connect a wallet to view your supplies, borrows, and health.">
        <PositionDashboard />
      </NetworkGuard>
    </main>
  )
}
