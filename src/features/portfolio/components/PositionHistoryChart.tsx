import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompact, formatUsd } from '#/lib/format'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { usePositionHistory } from '../hooks/usePositionHistory'
import { mergePositionSeries } from '../positionSeries'
import type { MergedPoint } from '../positionSeries'

function dayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

const LINES = [
  { key: 'supply', name: 'Supplied', color: 'var(--palm)' },
  { key: 'collateral', name: 'Collateral', color: 'var(--lagoon)' },
  { key: 'debt', name: 'Debt', color: 'var(--danger)' },
] as const

/** Supplied / Collateral / Debt over time, all in USD (R5, R6). */
function SeriesChart({ rows }: { rows: MergedPoint[] }) {
  const data = rows.map((r) => ({ ...r, label: dayLabel(r.timestamp) }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
          width={52}
          tickFormatter={(value: number) => `$${formatCompact(value)}`}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => formatUsd(Number(value))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {LINES.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * One pool's position history (R5, R6): Supplied, Collateral, and Debt in USD
 * over time, sourced through the indexer adapter with distinct loading,
 * unavailable (error), and empty states.
 */
export function PositionHistoryChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = usePositionHistory(market)
  const rows = mergePositionSeries(data)

  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0 text-[0.8rem] font-semibold text-[var(--sea-ink-soft)]">
        Position over time
      </h4>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error ? (
        <EmptyState
          title="Couldn't load history"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Your supply, collateral, and debt appear here once recorded."
        />
      ) : (
        <SeriesChart rows={rows} />
      )}
    </section>
  )
}
