import type { ReactNode } from 'react'

/** Shared app-page header: kicker + title. `compact` shrinks the title and
 *  spacing for list pages where the hero heading wastes vertical room.
 *  (Density is desktop=Pro; the mobile Simple/Pro toggle lives in the app
 *  header.) */
export function AppPageHeader({
  kicker,
  title,
  subtitle,
  compact = false,
}: {
  kicker?: string
  title: string
  subtitle?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? 'mb-3' : 'mb-8'}>
      {kicker ? <p className="island-kicker mb-1">{kicker}</p> : null}
      <h1
        className={
          compact
            ? 'display-title text-xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-2xl'
            : 'display-title text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl'
        }
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={
            compact
              ? 'm-0 mt-1 text-sm text-[var(--sea-ink-soft)]'
              : 'm-0 mt-2 text-base text-[var(--sea-ink-soft)] sm:text-lg'
          }
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
