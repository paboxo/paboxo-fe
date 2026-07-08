import { StatTile } from '#/components/ui/StatTile'
import { LoadingCard } from '#/components/ui/states/Loading'
import { formatCompact, formatPercent, formatUsd } from '#/lib/format'
import { useProtocolStats } from '../hooks/useProtocolStats'

/**
 * Protocol stats strip (U8, R13). TVL + utilization trace to the chain adapter;
 * cumulative volume + tx count to the indexer adapter.
 */
export function StatsStrip() {
  const { data, isLoading, error } = useProtocolStats()

  if (isLoading || error || !data) {
    // Stats are supplementary — degrade to a quiet skeleton, never an error wall.
    return <LoadingCard rows={1} />
  }

  return (
    <section
      className="island-shell flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl p-4"
      aria-label="Protocol stats"
    >
      <StatTile
        label="Total value locked"
        value={formatUsd(data.tvlUsd, { compact: true })}
        hero
      />
      <StatTile label="Utilization" value={formatPercent(data.utilization)} />
      <StatTile
        label="Cumulative volume"
        value={formatUsd(data.cumulativeVolumeUsd, { compact: true })}
      />
      <StatTile
        label="Transactions"
        value={formatCompact(data.transactionCount)}
      />
    </section>
  )
}
