import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { BorrowList } from '#/features/borrow/components/BorrowList'

export const Route = createFileRoute('/borrow')({ component: BorrowPage })

function BorrowPage() {
  return (
    <main className="page-wrap flex flex-col gap-6 px-4 pb-12 pt-8">
      <AppPageHeader
        kicker="Borrow"
        title="Borrow pxUSDT"
        subtitle="Supply collateral to an isolated pool and borrow pxUSDT against it."
      />
      <BorrowList />
    </main>
  )
}
