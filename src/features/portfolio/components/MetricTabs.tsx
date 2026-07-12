import { METRICS } from '../metrics'
import type { MetricKey } from '../metrics'

/** The Earn / Collateral / Borrow tab bar, shared by the general + market views. */
export function MetricTabs({
  active,
  onSelect,
}: {
  active: MetricKey
  onSelect: (key: MetricKey) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Metric">
      {METRICS.map((metric) => {
        const isActive = metric.key === active
        return (
          <button
            key={metric.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(metric.key)}
            className="rounded-lg px-3 py-1 text-[0.8rem] font-semibold transition-colors"
            style={{
              border: '1px solid var(--line)',
              background: isActive ? metric.color : 'transparent',
              color: isActive ? '#f3faf5' : 'var(--sea-ink-soft)',
            }}
          >
            {metric.label}
          </button>
        )
      })}
    </div>
  )
}
