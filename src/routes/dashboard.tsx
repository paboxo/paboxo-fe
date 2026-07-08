import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { PositionDashboard } from '#/features/position/components/PositionDashboard'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

function DashboardPage() {
  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <AppPageHeader kicker="Portfolio" title="Your position" />
      <PositionDashboard />
    </main>
  )
}
