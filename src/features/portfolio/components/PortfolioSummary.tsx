import { formatUsd } from '#/lib/format'
import { StatTile } from '#/components/ui/StatTile'
import { LoadingCard } from '#/components/ui/states/Loading'
import { usePortfolio } from '../hooks/usePortfolio'

/**
 * Cross-pool portfolio summary (U3) — deposits, collateral, loans, and net
 * worth totalled across every market, above the per-position detail.
 */
export function PortfolioSummary() {
  const { data, isLoading, error } = usePortfolio()

  if (isLoading) return <LoadingCard rows={1} />
  if (error || !data) return null

  return (
    <section
      className="island-shell flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl p-5"
      aria-label="Portfolio summary"
    >
      <StatTile label="Net worth" value={formatUsd(data.netWorthUsd)} hero />
      <StatTile label="Deposits" value={formatUsd(data.depositsUsd)} />
      <StatTile label="Collateral" value={formatUsd(data.collateralUsd)} />
      <StatTile
        label="Loans"
        value={formatUsd(data.loansUsd)}
        tone={data.loansUsd > 0 ? 'negative' : 'neutral'}
      />
    </section>
  )
}
