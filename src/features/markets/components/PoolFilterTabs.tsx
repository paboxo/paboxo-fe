const TABS = ['All Pools', 'High APY', 'Stablecoins'] as const

/**
 * Segmented pool filter (U7). Visual-only for now: "All Pools" is the sole
 * active filter; "High APY" and "Stablecoins" render per the design but are
 * inert (disabled), ready to be wired to real filtering later.
 */
export function PoolFilterTabs() {
  const active = 'All Pools'
  return (
    <div
      role="group"
      aria-label="Filter pools"
      className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] p-0.5 text-sm"
    >
      {TABS.map((tab) => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            type="button"
            aria-pressed={isActive}
            disabled={!isActive}
            className={
              isActive
                ? 'rounded-md bg-[var(--surface)] px-3 py-1.5 font-semibold text-[var(--sea-ink)]'
                : 'rounded-md px-3 py-1.5 font-semibold text-[var(--sea-ink-soft)] disabled:cursor-not-allowed'
            }
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}
