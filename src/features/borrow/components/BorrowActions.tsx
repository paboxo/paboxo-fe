import { useState } from 'react'
import { SupplyPanel } from '#/features/supply/components/SupplyPanel'
import { RepayPanel } from '#/features/repay/components/RepayPanel'
import { WithdrawPanel } from '#/features/withdraw/components/WithdrawPanel'
import type { MarketView } from '#/features/markets/types'
import { BorrowPanel } from './BorrowPanel'

type ActionKey = 'supply' | 'borrow' | 'repay' | 'withdraw'

const TABS: { key: ActionKey; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'borrow', label: 'Borrow' },
  { key: 'repay', label: 'Repay' },
  { key: 'withdraw', label: 'Withdraw' },
]

/** First-time borrower gate (R13, AE7): borrowing needs collateral first. */
function SupplyCollateralFirst({ onSupply }: { onSupply: () => void }) {
  return (
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
        You have no collateral in this pool yet. Supply collateral to unlock
        borrowing, repaying, and withdrawing.
      </p>
      <button
        type="button"
        onClick={onSupply}
        className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold"
        style={{ background: 'var(--palm)', color: '#ffffff' }}
      >
        Supply collateral first
      </button>
    </div>
  )
}

/**
 * The Borrow-side action host (U4, R8, R13, AE7). Hosts the integrated position
 * actions — supply collateral, borrow, repay, withdraw collateral — as tabs
 * (mirroring MarketActions). A first-time borrower with no collateral can only
 * supply collateral: borrow / repay / withdraw are gated behind a
 * "Supply collateral first" CTA that switches to the collateral action.
 */
export function BorrowActions({
  market,
  hasCollateral,
}: {
  market: MarketView
  hasCollateral: boolean
}) {
  const [active, setActive] = useState<ActionKey>('borrow')

  const renderPanel = () => {
    if (active === 'supply') return <SupplyPanel market={market} />
    // Borrow / repay / withdraw all require existing collateral.
    if (!hasCollateral) {
      return <SupplyCollateralFirst onSupply={() => setActive('supply')} />
    }
    if (active === 'borrow') return <BorrowPanel market={market} />
    if (active === 'repay') return <RepayPanel market={market} />
    return <WithdrawPanel market={market} />
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Borrow actions"
        className="island-shell flex gap-1 rounded-full p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-bold ${
              active === tab.key
                ? 'text-white'
                : 'text-[var(--sea-ink-soft)]'
            }`}
            style={
              active === tab.key ? { background: 'var(--palm)' } : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderPanel()}
    </div>
  )
}
