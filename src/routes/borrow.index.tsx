import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { BorrowList } from '#/features/borrow/components/BorrowList'

export const Route = createFileRoute('/borrow/')({ component: BorrowPage })

function BorrowPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader
        compact
        kicker="Borrow"
        subtitle="Lend and borrow across chains — post collateral to borrow pxUSDT."
      />
      <BorrowList />
    </main>
  )
}
