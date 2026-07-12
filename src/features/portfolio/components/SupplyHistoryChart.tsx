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
import type { SupplyPoint } from '#/lib/data'
import { LoadingCard } from '#/components/ui/states/Loading'
import { EmptyState } from '#/components/ui/states/EmptyState'
import type { MarketView } from '#/features/markets/types'
import { useSupplyHistory } from '../hooks/useSupplyHistory'

function dayLabel(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

/** Presentational daily supplied-value area chart, themed to the blue palette. */
function SupplyChart({ data }: { data: SupplyPoint[] }) {
  const rows = data.map((point) => ({
    ...point,
    label: dayLabel(point.timestamp),
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id="supplyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--palm)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--palm)" stopOpacity={0} />
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
          dataKey="suppliedUsd"
          name="Supplied"
          stroke="var(--palm)"
          strokeWidth={2}
          fill="url(#supplyFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * Daily supply-over-time for one pool (R5, R6), sourced through the indexer
 * adapter. Loading, unavailable (adapter error), and empty (no recorded
 * history) states are distinct so an outage never reads as "no history".
 */
export function SupplyHistoryChart({ market }: { market: MarketView }) {
  const { data, isLoading, error } = useSupplyHistory(market.poolAddress)

  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0 text-[0.8rem] font-semibold text-[var(--sea-ink-soft)]">
        Supply over time
      </h4>
      {isLoading ? (
        <LoadingCard rows={2} />
      ) : error ? (
        <EmptyState
          title="Couldn't load supply history"
          description="The indexer request failed. It'll retry shortly."
        />
      ) : data.length === 0 ? (
        <EmptyState
          title="No supply history yet"
          description="Your daily supplied balance appears here once recorded."
        />
      ) : (
        <SupplyChart data={data} />
      )}
    </section>
  )
}
