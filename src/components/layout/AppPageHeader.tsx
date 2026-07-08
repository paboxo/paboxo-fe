import type { ReactNode } from 'react'
import { DensityToggle } from './DensityToggle'

/** Shared app-page header (kicker + title + the Simple/Pro toggle). */
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <p className="island-kicker mb-1">{kicker}</p> : null}
        <h1 className="display-title text-3xl font-semibold text-[var(--sea-ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="m-0 mt-1 text-[var(--sea-ink-soft)]">{subtitle}</p>
        ) : null}
      </div>
      <DensityToggle />
    </div>
  )
}
