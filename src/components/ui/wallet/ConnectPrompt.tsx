/**
 * Inline connect CTA (U8, R22). Read-only surfaces render fully; only
 * position-specific slots swap in this prompt instead of walling the page.
 */
export function ConnectPrompt({
  action = 'continue',
  onConnect,
}: {
  action?: string
  onConnect?: () => void
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[0.82rem]"
      style={{
        background: 'color-mix(in oklab, var(--lagoon) 10%, transparent)',
      }}
    >
      <span className="text-[var(--sea-ink-soft)]">
        Connect a wallet to {action}.
      </span>
      <button
        type="button"
        onClick={onConnect}
        className="ml-auto rounded-lg px-2.5 py-1 text-[0.78rem] font-bold"
        style={{ background: 'var(--palm)', color: '#f3faf5' }}
      >
        Connect
      </button>
    </div>
  )
}
