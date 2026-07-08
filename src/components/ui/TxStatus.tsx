import type { TxState } from '#/lib/tx/txState'
import type { NormalizedRevert } from '#/lib/tx/revertReason'

export interface TxStep {
  label: string
}

/**
 * Approve→act stepper (U5, R14). Chips fill as steps complete so a second
 * signature is expected, not a surprise.
 */
export function TxStepper({
  steps,
  activeIndex,
}: {
  steps: TxStep[]
  activeIndex: number
}) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Transaction steps">
      {steps.map((step, index) => {
        const status =
          index < activeIndex
            ? 'done'
            : index === activeIndex
              ? 'active'
              : 'todo'
        return (
          <li
            key={step.label}
            data-step-status={status}
            className="rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
            style={
              status === 'done'
                ? { background: 'var(--palm)', color: '#f3faf5' }
                : status === 'active'
                  ? {
                      background:
                        'color-mix(in oklab, var(--lagoon) 26%, var(--surface-strong))',
                      color: 'var(--sea-ink)',
                    }
                  : {
                      background: 'transparent',
                      color: 'var(--sea-ink-soft)',
                      border: '1px solid var(--line)',
                    }
            }
          >
            {index + 1} · {step.label}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Inline transaction status (U5, R15). Rejection is a soft, neutral note (not an
 * error); a revert shows the plain-language reason with the raw error tucked
 * into a Details disclosure; confirmation is a calm palm-green check.
 */
export function TxStatus({
  state,
  revert,
}: {
  state: TxState
  revert?: NormalizedRevert
}) {
  if (state === 'rejected') {
    return (
      <p
        className="m-0 text-[0.8rem] text-[var(--sea-ink-soft)]"
        role="status"
        data-tone="neutral"
      >
        Signature cancelled — nothing was sent.
      </p>
    )
  }
  if (state === 'confirmed') {
    return (
      <p
        className="m-0 inline-flex items-center gap-1.5 text-[0.8rem] font-semibold"
        role="status"
        data-tone="positive"
        style={{ color: 'var(--palm)' }}
      >
        <span aria-hidden="true">✓</span> Confirmed
      </p>
    )
  }
  if (state === 'reverted' || state === 'error') {
    return (
      <div role="alert" data-tone="danger" className="text-[0.8rem]">
        <p className="m-0 font-semibold" style={{ color: 'var(--danger)' }}>
          {revert?.message ?? 'The transaction failed.'}
        </p>
        {revert?.raw ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-[0.72rem] text-[var(--sea-ink-soft)]">
              Details
            </summary>
            <code className="mt-1 block break-all text-[0.72rem]">
              {revert.raw}
            </code>
          </details>
        ) : null}
      </div>
    )
  }
  return null
}
