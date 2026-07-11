import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { NetworkGuard } from '#/components/wallet/NetworkGuard'
import { SwapPanel } from '#/features/swap/components/SwapPanel'

export const Route = createFileRoute('/swap')({ component: SwapPage })

function SwapPage() {
  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <div className="text-center">
        <AppPageHeader
          title="Swap Tokens"
          subtitle="Trade assets instantly across networks."
        />
      </div>
      <NetworkGuard description="Connect a wallet to swap the collateral in your position.">
        <SwapPanel />
      </NetworkGuard>
    </main>
  )
}
