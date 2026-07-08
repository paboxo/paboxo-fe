/**
 * Proactive wrong-network banner (U8, R23). One-click switch, no page refresh.
 * Rendered by the caller only when the wallet is on the wrong chain; the switch
 * action (and any add-chain fallback) is injected.
 */
export function NetworkBanner({
  currentChainName,
  targetName = 'HashKey',
  onSwitch,
}: {
  currentChainName: string
  targetName?: string
  onSwitch?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-[0.82rem]"
      style={{ background: 'var(--caution-soft)' }}
    >
      <span
        className="text-[0.7rem] font-bold"
        style={{ color: 'var(--caution)' }}
      >
        ⚠ Wrong network
      </span>
      <span className="text-[var(--sea-ink)]">
        You’re on {currentChainName}. Switch to {targetName} to continue.
      </span>
      <button
        type="button"
        onClick={onSwitch}
        className="ml-auto rounded-lg px-2.5 py-1 text-[0.78rem] font-bold"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Switch
      </button>
    </div>
  )
}
