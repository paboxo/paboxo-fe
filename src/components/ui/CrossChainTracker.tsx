export type CrossChainStep = 'sent' | 'relaying' | 'arrived'

export interface CrossChainTransfer {
  id: string
  sourceChain: string
  destChain: string
  amount: string
  symbol: string
  step: CrossChainStep
  sourceTxUrl?: string
  destTxUrl?: string
  /** Epoch ms when the source tx confirmed. */
  startedAt: number
  etaSeconds: number
}

const ORDER: CrossChainStep[] = ['sent', 'relaying', 'arrived']

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/**
 * Persistent cross-chain transfer tracker (U14, R25). A distinct, longer-lived
 * state than a local tx — coastal in-transit motif, honest ETA/elapsed, both
 * ledgers linked, and a recovery path when it runs long.
 */
export function CrossChainTracker({
  transfer,
  nowMs,
  onCheckStatus,
}: {
  transfer: CrossChainTransfer
  nowMs?: number
  onCheckStatus?: () => void
}) {
  const now = nowMs ?? Date.now()
  const activeIndex = ORDER.indexOf(transfer.step)
  const elapsed = Math.max(0, Math.floor((now - transfer.startedAt) / 1000))
  const overdue = transfer.step !== 'arrived' && elapsed > transfer.etaSeconds

  const steps = [
    `① Sent on ${transfer.sourceChain}`,
    `② Relaying · ~${Math.round(transfer.etaSeconds / 60)} min`,
    `③ Arriving on ${transfer.destChain}`,
  ]

  return (
    <div
      className="island-shell flex flex-col gap-2 rounded-2xl p-4"
      role="group"
      aria-label="Cross-chain transfer"
      data-step={transfer.step}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true">⛵</span>
        <span className="font-semibold text-[var(--sea-ink)]">
          {transfer.amount} {transfer.symbol} → {transfer.destChain}
        </span>
        <span className="num ml-auto text-[0.75rem] text-[var(--sea-ink-soft)]">
          {formatElapsed(elapsed)}
        </span>
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Transfer steps">
        {steps.map((label, index) => {
          const status =
            index < activeIndex
              ? 'done'
              : index === activeIndex
                ? 'active'
                : 'todo'
          return (
            <li
              key={label}
              data-status={status}
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
              {label}
              {status === 'done' ? ' ✓' : ''}
            </li>
          )
        })}
      </ol>

      <p className="m-0 text-[0.75rem] text-[var(--sea-ink-soft)]">
        You can safely leave this page — your transfer will continue.
      </p>

      {overdue ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.78rem]"
          style={{ background: 'var(--caution-soft)' }}
        >
          Taking longer than usual.
          <button
            type="button"
            onClick={onCheckStatus}
            className="ml-auto font-bold"
            style={{ color: 'var(--lagoon-deep)' }}
          >
            Check status
          </button>
        </div>
      ) : null}

      <div className="flex gap-4 text-[0.75rem]">
        {transfer.sourceTxUrl ? (
          <a href={transfer.sourceTxUrl} target="_blank" rel="noreferrer">
            Source tx ↗
          </a>
        ) : null}
        {transfer.destTxUrl ? (
          <a href={transfer.destTxUrl} target="_blank" rel="noreferrer">
            Destination tx ↗
          </a>
        ) : null}
      </div>
    </div>
  )
}
