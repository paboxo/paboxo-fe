/**
 * A card-level error with a path forward (U7, R24). Names the problem and offers
 * a retry — never a raw stack trace.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      className="island-shell flex flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center"
      role="alert"
    >
      <p className="m-0 font-semibold" style={{ color: 'var(--danger)' }}>
        {title}
      </p>
      {message ? (
        <p className="m-0 max-w-sm text-[0.86rem] text-[var(--sea-ink-soft)]">
          {message}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-[0.82rem] font-bold text-[var(--sea-ink)]"
        >
          Retry
        </button>
      ) : null}
    </div>
  )
}

/**
 * A non-blocking degradation banner (U7, R24). When the indexer is unreachable,
 * balances and actions keep working — only event-derived data is unavailable.
 */
export function DegradedNotice({
  message = 'Live market history is temporarily unavailable — your balances and actions still work.',
}: {
  message?: string
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8rem]"
      role="status"
      style={{ background: 'var(--caution-soft)', color: 'var(--sea-ink)' }}
    >
      <span aria-hidden="true">◐</span>
      {message}
    </div>
  )
}
