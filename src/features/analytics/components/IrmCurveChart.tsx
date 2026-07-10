import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { IrmCurve } from '../hooks/useIrmCurve'

/**
 * The interest-rate-model curve (Aave-style): Borrow APR vs Utilization with the
 * two-slope kink, plus dashed markers for the optimal and current utilization.
 */
export function IrmCurveChart({ curve }: { curve: IrmCurve }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={curve.points}
        margin={{ top: 18, right: 12, bottom: 0, left: -8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
        <XAxis
          dataKey="util"
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          unit="%"
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
        />
        <YAxis
          unit="%"
          tick={{ fontSize: 11, fill: 'var(--sea-ink-soft)' }}
          stroke="var(--line)"
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => `${Number(value).toFixed(2)}%`}
          labelFormatter={(label) => `Utilization ${Number(label).toFixed(0)}%`}
        />
        <ReferenceLine
          x={curve.optimalUtil}
          stroke="var(--lagoon)"
          strokeDasharray="4 4"
          label={{
            value: `Optimal ${curve.optimalUtil.toFixed(0)}%`,
            position: 'top',
            fontSize: 11,
            fill: 'var(--sea-ink-soft)',
          }}
        />
        {/* An unreadable utilization draws no marker — a line at 0% would be a
            lie, not a default. */}
        {curve.currentUtil === undefined ? null : (
          <ReferenceLine
            x={curve.currentUtil}
            stroke="var(--palm)"
            strokeDasharray="4 4"
            label={{
              value: `Current ${curve.currentUtil.toFixed(0)}%`,
              position: 'insideTopLeft',
              fontSize: 11,
              fill: 'var(--palm)',
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="borrowApr"
          name="Borrow APR"
          stroke="var(--palm)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
