import { truncateAddress } from './wallet/AccountPill'

export interface Allowance {
  id: string
  token: string
  spender: string
  spenderLabel?: string
  /** Human-formatted remaining allowance. */
  amount: string
}

/**
 * Active-allowance manager (U15, R26). Lists standing approvals with a
 * one-click revoke, and explains that they persist on-chain until revoked.
 */
export function ApprovalsManager({
  allowances,
  onRevoke,
}: {
  allowances: Allowance[]
  onRevoke: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Allowances stay on-chain until you revoke them — even after you
        disconnect. Paboxo only ever requests the exact amount.
      </p>
      {allowances.length === 0 ? (
        <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
          No active allowances.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {allowances.map((allowance) => (
            <li
              key={allowance.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-semibold text-[var(--sea-ink)]">
                  {allowance.token} →{' '}
                  {allowance.spenderLabel ?? truncateAddress(allowance.spender)}
                </div>
                <div className="num text-[0.75rem] text-[var(--sea-ink-soft)]">
                  Allowance: {allowance.amount}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(allowance.id)}
                className="ml-auto rounded-lg px-2.5 py-1 text-[0.78rem] font-bold"
                style={{
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
