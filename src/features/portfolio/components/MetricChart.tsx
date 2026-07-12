import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompact, formatUsd } from '#/lib/format'
import type { Metric } from '../metrics'
import type { MergedPoint } from '../positionSeries'

function dayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** A single metric (Earn / Collateral / Borrow) as a USD area over time. */
export function MetricChart({
  rows,
  metric,
  height = 220,
}: {
  rows: MergedPoint[]
  metric: Metric
  height?: number
}) {
  const data = rows.map((r) => ({
    label: dayLabel(r.timestamp),
    value: r[metric.key],
  }))
  const gradientId = `metric-fill-${metric.key}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="value"
          name={metric.label}
          stroke={metric.color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
