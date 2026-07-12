export type CrossChainStep = 'sent' | 'relaying' | 'arrived'

export interface CrossChainTransfer {
  id: string
  sourceChain: string
  destChain: string
  amount: string
  symbol: string
  /** CCIP explorer link (by source tx hash) — the authoritative relay/delivery view. */
  ccipUrl?: string
  // Legacy fields — still written by some callers, unused by the success view.
  step?: CrossChainStep
  sourceTxUrl?: string
  destTxUrl?: string
  startedAt?: number
  etaSeconds?: number
}

/**
 * Cross-chain transfer confirmation (U14, R25). Once the source tx confirms,
 * delivery is only a matter of time — CCIP finalizes it automatically — so this
 * shows a single success state and links the CCIP explorer for the live relay
 * status, rather than a local step/ETA tracker that would drift out of sync.
 */
export function CrossChainTracker({
  transfer,
}: {
  transfer: CrossChainTransfer
}) {
  return (
    <div
      className="island-shell flex flex-col gap-2 rounded-2xl p-4"
      role="group"
      aria-label="Cross-chain transfer"
    >
      <div className="flex items-center gap-2">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--safe)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.5 2.5 4.5-5" />
        </svg>
        <span className="font-semibold text-[var(--sea-ink)]">
          {transfer.amount} {transfer.symbol} → {transfer.destChain}
        </span>
      </div>

      <p className="m-0 text-[0.8rem] text-[var(--sea-ink-soft)]">
        Sent on {transfer.sourceChain} — arriving on {transfer.destChain}{' '}
        shortly. You can safely leave this page.
      </p>

      {transfer.ccipUrl ? (
        <a
          href={transfer.ccipUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[0.8rem] font-semibold"
          style={{ color: 'var(--palm)' }}
        >
          Track on CCIP ↗
        </a>
      ) : null}
    </div>
  )
}
