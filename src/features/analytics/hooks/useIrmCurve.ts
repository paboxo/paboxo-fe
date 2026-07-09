/**
 * Interest-rate-model curve (Aave-style). Reads the market's IRM parameters
 * through the chain adapter (real on-chain values in live mode, config in mock),
 * converts WAD → percent, and samples the two-slope borrow-rate curve for the
 * chart, with the optimal + current utilization markers.
 */
import { useQuery } from '@tanstack/react-query'
import { getAdapters } from '#/lib/data'
import { borrowRateAtUtilization, wadToPercent } from '#/lib/math'
import type { IrmCurveParams } from '#/lib/math'
import type { MarketView } from '#/features/markets/types'
import type { QueryResult } from '#/features/shared/query'

export interface IrmCurvePoint {
  util: number
  borrowApr: number
}

export interface IrmCurve {
  points: IrmCurvePoint[]
  params: IrmCurveParams
  optimalUtil: number
  maxUtil: number
  currentUtil: number
}

function buildCurve(params: IrmCurveParams, currentUtil: number): IrmCurve {
  // Sample every 2%, plus the exact kink points so the corners stay sharp.
  const utils = new Set<number>([params.optimalUtilPct, params.maxUtilPct])
  for (let u = 0; u <= 100; u += 2) utils.add(u)
  const points = [...utils]
    .sort((a, b) => a - b)
    .map((util) => ({
      util,
      borrowApr: Number(borrowRateAtUtilization(util, params).toFixed(2)),
    }))
  return {
    points,
    params,
    optimalUtil: params.optimalUtilPct,
    maxUtil: params.maxUtilPct,
    currentUtil,
  }
}

export function useIrmCurve(market: MarketView): QueryResult<IrmCurve | null> {
  const query = useQuery({
    queryKey: ['irm-params', market.poolAddress],
    queryFn: () => getAdapters().chain.getIrmParams(market.poolAddress),
  })
  const params: IrmCurveParams | null = query.data
    ? {
        basePct: wadToPercent(query.data.baseRateWad),
        rateAtOptimalPct: wadToPercent(query.data.rateAtOptimalWad),
        maxRatePct: wadToPercent(query.data.maxRateWad),
        optimalUtilPct: wadToPercent(query.data.optimalUtilWad),
        maxUtilPct: wadToPercent(query.data.maxUtilWad),
      }
    : null
  return {
    data: params ? buildCurve(params, market.utilization) : null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
