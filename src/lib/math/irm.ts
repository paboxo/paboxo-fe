/**
 * Interest-rate-model curve (the two-slope / kinked model, Aave-style). Given a
 * market's IRM parameters, the borrow rate is a piecewise-linear function of
 * utilization: gentle from `base` to `rateAtOptimal` up to the optimal
 * utilization, steep from there to `maxRate` at the max utilization, then flat.
 * All values are display percents.
 */
export interface IrmCurveParams {
  basePct: number
  rateAtOptimalPct: number
  maxRatePct: number
  optimalUtilPct: number
  maxUtilPct: number
}

/** Borrow rate (%) at a given utilization (%) for the two-slope IRM. */
export function borrowRateAtUtilization(
  utilPct: number,
  params: IrmCurveParams,
): number {
  const { basePct, rateAtOptimalPct, maxRatePct, optimalUtilPct, maxUtilPct } =
    params
  if (utilPct <= optimalUtilPct) {
    if (optimalUtilPct <= 0) return basePct
    return basePct + (rateAtOptimalPct - basePct) * (utilPct / optimalUtilPct)
  }
  if (utilPct >= maxUtilPct) return maxRatePct
  const span = maxUtilPct - optimalUtilPct
  if (span <= 0) return maxRatePct
  return (
    rateAtOptimalPct +
    (maxRatePct - rateAtOptimalPct) * ((utilPct - optimalUtilPct) / span)
  )
}
