import { isTxBusy, txButtonLabel } from '#/lib/tx/txState'
import type { TxState } from '#/lib/tx/txState'

function Spinner() {
  return (
    <svg
      className="motion-safe:animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export interface ActionButtonProps {
  state: TxState
  /** Label shown at rest and after a failure (the user retries the same action). */
  idleLabel: string
  approveLabel?: string
  disabled?: boolean
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  /**
   * Id of the element explaining why the button is disabled.
   *
   * A native `disabled` button takes no hover and no focus, so a tooltip never
   * reaches a keyboard or screen-reader user. The reason must be a sibling that
   * this button points at.
   */
  'aria-describedby'?: string
}

/**
 * The transaction state machine's face (U5, R14). The label mutates with the
 * state; the button is busy (disabled + spinner) while approving/signing/pending
 * and returns to the idle label after a failure so the user can retry.
 */
export function ActionButton({
  state,
  idleLabel,
  approveLabel,
  disabled = false,
  onClick,
  variant = 'primary',
  'aria-describedby': describedBy,
}: ActionButtonProps) {
  const busy = isTxBusy(state)
  const isDisabled = disabled || busy || state === 'confirmed'
  const primary = variant === 'primary'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-describedby={describedBy}
      data-state={state}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
      style={
        primary
          ? { background: 'var(--palm)', color: '#f3faf5' }
          : {
              background: 'var(--chip-bg)',
              color: 'var(--sea-ink)',
              border: '1px solid var(--line)',
            }
      }
    >
      {busy ? <Spinner /> : null}
      {txButtonLabel(state, idleLabel, approveLabel)}
    </button>
  )
}
