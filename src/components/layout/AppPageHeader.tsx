import type { ReactNode } from 'react'

/** Shared app-page header (kicker + title). The density toggle lives in the app header. */
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
    <div className="mb-6">
      {kicker ? <p className="island-kicker mb-1">{kicker}</p> : null}
      <h1 className="display-title text-3xl font-semibold text-[var(--sea-ink)]">
        {title}
      </h1>
      {subtitle ? (
        <p className="m-0 mt-1 text-[var(--sea-ink-soft)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
