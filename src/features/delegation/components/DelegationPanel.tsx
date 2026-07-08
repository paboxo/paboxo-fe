import { useState } from 'react'
import { ApprovalsManager } from '#/components/ui/ApprovalsManager'
import type { Allowance } from '#/components/ui/ApprovalsManager'
import { DelegationFlow } from '#/components/ui/DelegationFlow'

const DEMO_ALLOWANCES: Allowance[] = [
  {
    id: 'a1',
    token: 'pxUSDT',
    spender: '0x9a4C…B21f',
    spenderLabel: 'LendingPool',
    amount: '500',
  },
]

/** Advanced approvals + delegation surface (U15, R26). */
export function DelegationPanel() {
  const [allowances, setAllowances] = useState(DEMO_ALLOWANCES)
  const [granting, setGranting] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <section className="island-shell flex flex-col gap-3 rounded-2xl p-4">
        <h3 className="display-title m-0 text-base font-semibold">Approvals</h3>
        <ApprovalsManager
          allowances={allowances}
          onRevoke={(id) =>
            setAllowances((current) => current.filter((a) => a.id !== id))
          }
        />
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
            asset="pxUSDT"
            cap="1,000"
            onConfirm={() => setGranting(false)}
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
