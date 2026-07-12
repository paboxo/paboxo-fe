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

/** Presentational Supplied / Collateral / Debt line chart, all in USD (R5, R6). */
export function PositionSeriesChart({
  rows,
  height = 200,
}: {
  rows: MergedPoint[]
  height?: number
}) {
  const data = rows.map((r) => ({ ...r, label: dayLabel(r.timestamp) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
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
