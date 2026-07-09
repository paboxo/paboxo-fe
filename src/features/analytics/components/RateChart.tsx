import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RatePoint } from '#/lib/data'

function dayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Presentational borrow/supply rate line chart (U5), themed to the blue palette. */
export function RateChart({ data }: { data: RatePoint[] }) {
  const rows = data.map((point) => ({ ...point, label: dayLabel(point.timestamp) }))
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
          unit="%"
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
          width={44}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => `${Number(value).toFixed(2)}%`}
        />
        <Line
          type="monotone"
          dataKey="borrowApr"
          name="Borrow APR"
          stroke="var(--palm)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="supplyApy"
          name="Supply APY"
          stroke="var(--lagoon)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
