import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { EarnList } from '#/features/earn/components/EarnList'

export const Route = createFileRoute('/earn/')({ component: EarnPage })

function EarnPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader
        compact
        title="Earn"
        subtitle="Lend and borrow across chains — supply pxUSDT to earn its pool APY."
      />
      <EarnList />
    </main>
  )
}
