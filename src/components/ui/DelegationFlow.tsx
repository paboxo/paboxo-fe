import { useState } from 'react'
import { truncateAddress } from './wallet/AccountPill'

/**
 * Deliberate delegation grant (U15, R26). Distinct from the "Approve" chrome:
 * restates the consequence in plain words, shows the exact cap, and requires an
 * explicit confirmation before it can be granted.
 */
export function DelegationFlow({
  delegate,
  asset,
  cap,
  onConfirm,
  onCancel,
}: {
  delegate: string
  asset: string
  cap: string
  onConfirm?: () => void
  onCancel?: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div
      className="island-shell flex flex-col gap-3 rounded-2xl p-4"
      role="group"
      aria-label="Grant borrow delegation"
    >
      <p className="m-0 text-[0.86rem] text-[var(--sea-ink)]">
        You’re allowing <b>{truncateAddress(delegate)}</b> to borrow up to{' '}
        <span className="num font-semibold">
          {cap} {asset}
        </span>{' '}
        using <b>your</b> collateral. If they don’t repay, <b>your</b>{' '}
        collateral is at risk.
      </p>
      <label className="flex items-start gap-2 text-[0.8rem] text-[var(--sea-ink)]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I understand and want to grant this delegation.
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!confirmed}
          onClick={onConfirm}
          className="rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'var(--palm)', color: '#f3faf5' }}
        >
          Grant delegation
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-bold text-[var(--sea-ink-soft)]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
