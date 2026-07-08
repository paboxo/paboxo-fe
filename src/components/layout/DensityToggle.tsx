import { useDensity } from '#/components/density/useDensity'
import type { Density } from '#/components/density/useDensity'

const OPTIONS: { value: Density; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'pro', label: 'Pro' },
]

/** The Simple↔Pro segmented control (U9, R7). */
export function DensityToggle() {
  const { density, setDensity } = useDensity()
  return (
    <div
      className="inline-flex rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] p-0.5"
      role="group"
      aria-label="Display density"
    >
      {OPTIONS.map((option) => {
        const active = density === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setDensity(option.value)}
            aria-pressed={active}
            className="rounded-full px-2.5 py-1 text-[0.72rem] font-bold transition"
            style={
              active
                ? { background: 'var(--palm)', color: '#f3faf5' }
                : { background: 'transparent', color: 'var(--sea-ink-soft)' }
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
