export type ToastTone = 'neutral' | 'positive' | 'danger'

const TONE_ACCENT: Record<ToastTone, string> = {
  neutral: 'var(--lagoon)',
  positive: 'var(--palm)',
  danger: 'var(--danger)',
}

/**
 * A single frosted toast (U5, R14). One toast per transaction, updated in place
 * — a thin accent underline reads as progress. Presentational only; a host owns
 * the toast queue and lifecycle.
 */
export function TxToast({
  tone = 'neutral',
  title,
  actionLabel,
  actionHref,
  onAction,
  busy = false,
}: {
  tone?: ToastTone
  title: string
  actionLabel?: string
  /** When set, the action renders as an external link (e.g. a block explorer). */
  actionHref?: string
  onAction?: () => void
  busy?: boolean
}) {
  return (
    <div
      className="island-shell relative min-w-[240px] overflow-hidden rounded-xl px-3.5 py-2.5"
      role="status"
      data-tone={tone}
    >
      <div className="flex items-center gap-3">
        <span className="text-[0.85rem] font-semibold text-[var(--sea-ink)]">
          {title}
        </span>
        {actionLabel && actionHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[0.78rem] font-bold no-underline hover:underline"
            style={{ color: 'var(--lagoon-deep)' }}
          >
            {actionLabel}
          </a>
        ) : actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="ml-auto text-[0.78rem] font-bold"
            style={{ color: 'var(--lagoon-deep)' }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <span
        className="absolute inset-x-0 bottom-0 h-0.5"
        style={{
          background: TONE_ACCENT[tone],
          width: busy ? '40%' : '100%',
          transition: 'width var(--dur-slow) var(--ease-out)',
        }}
        aria-hidden="true"
      />
    </div>
  )
}
