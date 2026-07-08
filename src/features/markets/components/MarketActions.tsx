import { useState } from 'react'
import { SupplyPanel } from '#/features/supply/components/SupplyPanel'
import { BorrowPanel } from '#/features/borrow/components/BorrowPanel'
import { RepayPanel } from '#/features/repay/components/RepayPanel'
import { WithdrawPanel } from '#/features/withdraw/components/WithdrawPanel'
import type { MarketView } from '../types'

type ActionKey = 'supply' | 'borrow' | 'repay' | 'withdraw'

const TABS: { key: ActionKey; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'borrow', label: 'Borrow' },
  { key: 'repay', label: 'Repay' },
  { key: 'withdraw', label: 'Withdraw' },
]

/**
 * The market's action host (U20). One tabbed panel hosting the write actions —
 * each tab is now backed by its real hook + the shared pre-flight gate (U10–U12).
 * Liquidate/Delegation/create-pool are reached from their own entry points.
 */
export function MarketActions({ market }: { market: MarketView }) {
  const [active, setActive] = useState<ActionKey>('supply')

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Market actions"
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
                ? 'text-[#f3faf5]'
                : 'text-[var(--sea-ink-soft)]'
            }`}
            style={active === tab.key ? { background: 'var(--palm)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'supply' && <SupplyPanel market={market} />}
      {active === 'borrow' && <BorrowPanel market={market} />}
      {active === 'repay' && <RepayPanel market={market} />}
      {active === 'withdraw' && <WithdrawPanel market={market} />}
    </div>
  )
}
