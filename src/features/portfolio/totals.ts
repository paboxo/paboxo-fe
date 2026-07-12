/** One pool's contribution to the portfolio totals (all USD, via exchange rate). */
export interface PoolStat {
  active: boolean
  suppliedUsd: number
  collateralUsd: number
  debtUsd: number
}

export interface PortfolioTotals {
  activePools: number
  suppliedUsd: number
  collateralUsd: number
  debtUsd: number
  netUsd: number
}

/** Sum active pools only; net = supplied + collateral − debt. Pure + testable. */
export function sumPoolStats(stats: PoolStat[]): PortfolioTotals {
  const active = stats.filter((s) => s.active)
  const suppliedUsd = active.reduce((sum, s) => sum + s.suppliedUsd, 0)
  const collateralUsd = active.reduce((sum, s) => sum + s.collateralUsd, 0)
  const debtUsd = active.reduce((sum, s) => sum + s.debtUsd, 0)
  return {
    activePools: active.length,
    suppliedUsd,
    collateralUsd,
    debtUsd,
    netUsd: suppliedUsd + collateralUsd - debtUsd,
  }
}
