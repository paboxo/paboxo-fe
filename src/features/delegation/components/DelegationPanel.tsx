import { useState } from 'react'
import { formatTokenAmount } from '#/lib/format'
import { ApprovalsManager } from '#/components/ui/ApprovalsManager'
import type { Allowance } from '#/components/ui/ApprovalsManager'
import { DelegationFlow } from '#/components/ui/DelegationFlow'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { Address } from '#/lib/contracts'
import type { MarketView } from '#/features/markets/types'
import { useAllowances } from '../hooks/useAllowances'
import { useDelegation } from '../hooks/useDelegation'

/** Advanced approvals + delegation surface (U14, R23, R30). */
export function DelegationPanel({ market }: { market: MarketView }) {
  const { allowances, revoke } = useAllowances(market)
  const { grantBorrow } = useDelegation(market)
  const [granting, setGranting] = useState(false)

  const rows: Allowance[] = allowances.map((entry) => ({
    id: entry.token,
    token: entry.symbol,
    spender: market.poolAddress,
    spenderLabel: 'LendingPool',
    amount: formatTokenAmount(entry.allowance, entry.decimals),
  }))

  return (
    <div className="flex flex-col gap-5">
      <section className="island-shell flex flex-col gap-3 rounded-2xl p-4">
        <h3 className="display-title m-0 text-base font-semibold">Approvals</h3>
        {rows.length > 0 ? (
          <ApprovalsManager
            allowances={rows}
            onRevoke={(id) => void revoke(id as Address)}
          />
        ) : (
          <EmptyState
            title="No standing approvals"
            description="Token approvals you grant will appear here and can be revoked."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="display-title m-0 text-base font-semibold">
            Borrow delegation
          </h3>
          {!granting ? (
            <button
              type="button"
              onClick={() => setGranting(true)}
              className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-2.5 py-1 text-[0.78rem] font-bold text-[var(--sea-ink)]"
            >
              Grant new
            </button>
          ) : null}
        </div>
        {granting ? (
          <DelegationFlow
            delegate="0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A"
            asset={market.borrowSymbol}
            cap="1,000"
            onConfirm={() => {
              void grantBorrow(
                '0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A',
                1_000_000_000n,
              )
              setGranting(false)
            }}
            onCancel={() => setGranting(false)}
          />
        ) : (
          <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
            No active delegations.
          </p>
        )}
      </section>
    </div>
  )
}
