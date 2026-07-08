import type { ReactNode } from 'react'

/**
 * A teaching empty state (U7, R24, R29). Empty is onboarding, never a blank
 * panel: it explains the concept in one line and offers the next action.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div
      className="island-shell flex flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center"
      role="note"
    >
      {icon ? <div aria-hidden="true">{icon}</div> : null}
      <p className="display-title m-0 text-lg font-semibold text-[var(--sea-ink)]">
        {title}
      </p>
      {description ? (
        <p className="m-0 max-w-sm text-[0.86rem] text-[var(--sea-ink-soft)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
