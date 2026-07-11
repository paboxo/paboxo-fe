import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LiquidityPoint } from '#/lib/data'
import { formatUsd } from '#/lib/format'

function dayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Presentational available-liquidity line chart (U8), themed to the blue palette. */
export function LiquidityChart({ data }: { data: LiquidityPoint[] }) {
  const rows = data.map((point) => ({
    ...point,
    label: dayLabel(point.timestamp),
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
          width={64}
          tickFormatter={(value) => formatUsd(Number(value))}
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
        <Line
          type="monotone"
          dataKey="liquidityUsd"
          name="Liquidity"
          stroke="var(--palm)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
