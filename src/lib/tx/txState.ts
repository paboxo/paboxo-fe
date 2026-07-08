/**
 * The shared transaction state machine (U5, R14). One presentational state
 * drives the action button, the stepper, and the toast so no write path is
 * bespoke. Wallet rejection and on-chain revert are distinct terminal states.
 */
export type TxState =
  | 'idle'
  | 'approving'
  | 'signing'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'reverted'
  | 'error'

const TX_BUSY: ReadonlySet<TxState> = new Set([
  'approving',
  'signing',
  'pending',
])

export function isTxBusy(state: TxState): boolean {
  return TX_BUSY.has(state)
}

export function isTxFailure(state: TxState): boolean {
  return state === 'reverted' || state === 'error'
}

/** The button label mutates with the state so the button is the machine's face. */
export function txButtonLabel(
  state: TxState,
  idleLabel: string,
  approveLabel?: string,
): string {
  switch (state) {
    case 'approving':
      return approveLabel ? `Approving ${approveLabel}…` : 'Approving…'
    case 'signing':
      return 'Confirm in your wallet…'
    case 'pending':
      return 'Confirming…'
    case 'confirmed':
      return 'Done'
    default:
      return idleLabel
  }
}
