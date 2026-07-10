import type { ReactNode } from 'react'

/** Shared app-page header: kicker + title. (Density is desktop=Pro; the mobile
 *  Simple/Pro toggle lives in the app header.) */
export function AppPageHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string
  title: string
  subtitle?: ReactNode
}) {
  return (
    <div className="mb-8">
      {kicker ? <p className="island-kicker mb-1">{kicker}</p> : null}
      <h1 className="display-title text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="m-0 mt-2 text-base text-[var(--sea-ink-soft)] sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}
