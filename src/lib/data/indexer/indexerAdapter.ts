/**
 * Live `IndexerAdapter` — the real Ponder GraphQL implementation. A typed `fetch`
 * wrapper runs the authored queries and maps indexer rows (every collection wraps
 * its rows in `items`) to the domain models the mock produces, so the UI is
 * unchanged across the swap.
 *
 * Two failure contracts live here:
 *  - The history/aggregate/cross-chain/rate reads feed non-critical surfaces and
 *    DEGRADE to an empty/zero result on any fault (never throw).
 *  - `getPools()` feeds the market list and instead REJECTS with `IndexerError`
 *    on any fault, so an indexer outage renders an error state rather than a
 *    false "no pools yet". It resolves `[]` only for a well-formed empty result.
 *
 * Selected via the registry only when `VITE_INDEXER_URL` is set; otherwise the
 * mock indexer is used.
 */
import { MARKETS, TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { wadToPercent } from '#/lib/math'
import type {
  CrossChainStatus,
  Hash,
  HistoryAction,
  HistoryEvent,
  IndexerAdapter,
  ProtocolAggregates,
  RatePoint,
  RawPool,
} from '../types'
import {
  CROSS_CHAIN_STATUS_QUERY,
  POOLS_QUERY,
  PROTOCOL_AGGREGATES_QUERY,
  RATE_HISTORY_QUERY,
  USER_HISTORY_QUERY,
} from './queries'

/** A pool list that never arrives is an outage, not a permanent spinner. */
const GET_POOLS_TIMEOUT_MS = 15_000

/** Thrown by `getPools` so the UI can tell an indexer outage from a bug. */
export class IndexerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IndexerError'
  }
}

interface GraphQLResponse<T> {
  data?: T
  errors?: unknown
}

/** Degrading transport: any fault resolves to `null` (the caller substitutes a
 *  safe empty/zero result). Used by every read EXCEPT `getPools`. */
async function graphql<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!response.ok) return null
    const json = (await response.json()) as GraphQLResponse<T>
    if (json.errors || !json.data) return null
    return json.data
  } catch {
    return null
  }
}

const EMPTY_AGGREGATES: ProtocolAggregates = {
  cumulativeVolumeUsd: 0,
  totalBorrowsUsd: 0,
  totalSuppliesUsd: 0,
  transactionCount: 0,
}

/** The universal borrow token — every live market borrows pxUSDT. */
const BORROW_TOKEN = TOKENS.pxUSDT.address

function tokenMeta(address: string): { symbol: string; decimals: number } {
  const lower = address.toLowerCase()
  for (const [symbol, info] of Object.entries(TOKENS)) {
    if (info.address.toLowerCase() === lower) {
      return { symbol, decimals: info.decimals }
    }
  }
  return { symbol: '', decimals: 18 }
}

function marketIdForPool(pool: string): string {
  return (
    MARKETS.find((m) => m.pool.toLowerCase() === pool.toLowerCase())?.id ?? ''
  )
}

/** A Ponder collection page — rows always arrive under `items`. */
interface Page<T> {
  items?: T[]
  /** Requested only where truncation would be silently wrong. */
  totalCount?: number
}

/** Common shape of the borrow-token-denominated activity rows. */
interface RawActivity {
  id: string
  lendingPoolAddress: string
  amount: string
  timestamp: number | string
  txHash: string
}

interface RawLiquidation {
  id: string
  lendingPoolAddress: string
  borrowToken: string
  userBorrowAssets: string
  timestamp: number | string
  txHash: string
}

function toHistoryEvent(
  action: HistoryAction,
  raw: {
    id: string
    pool: string
    token: string
    amount: string
    timestamp: number | string
    txHash: string
  },
): HistoryEvent {
  const meta = tokenMeta(raw.token)
  return {
    id: raw.id,
    action,
    pool: raw.pool as Address,
    marketId: marketIdForPool(raw.pool),
    amount: BigInt(raw.amount || '0'),
    token: raw.token as Address,
    tokenSymbol: meta.symbol,
    decimals: meta.decimals,
    timestamp: Number(raw.timestamp || 0),
    txHash: (raw.txHash || '0x') as Hash,
  }
}

/** Borrow-token activity (supply/withdraw/borrow/repay/cross-chain). */
function activityToEvent(
  action: HistoryAction,
  raw: RawActivity,
): HistoryEvent {
  return toHistoryEvent(action, {
    id: raw.id,
    pool: raw.lendingPoolAddress,
    token: BORROW_TOKEN,
    amount: raw.amount,
    timestamp: raw.timestamp,
    txHash: raw.txHash,
  })
}

interface HistoryData {
  supplyLiquiditys?: Page<RawActivity>
  withdrawLiquiditys?: Page<RawActivity>
  borrowDebts?: Page<RawActivity>
  repayByPositions?: Page<RawActivity>
  liquidations?: Page<RawLiquidation>
  borrowDebtCrossChains?: Page<RawActivity>
}

function items<T>(page: Page<T> | undefined): T[] {
  return page?.items ?? []
}

interface RateSnapshotRow {
  timestamp: number | string
  borrowApy: string
  supplyApy: string
}

interface CrossChainRow {
  id: string
  inboundTxHash?: string | null
  inboundAt?: number | null
}

export function createLiveIndexerAdapter(url: string): IndexerAdapter {
  return {
    async getPools(): Promise<RawPool[]> {
      let response: Response
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            query: POOLS_QUERY,
            variables: { chainId: 177 },
          }),
          // A hanging indexer would otherwise leave the pool query pending
          // forever — a spinner that never resolves into the error state.
          signal: AbortSignal.timeout(GET_POOLS_TIMEOUT_MS),
        })
      } catch {
        throw new IndexerError('indexer request failed')
      }
      if (!response.ok) {
        throw new IndexerError(`indexer responded ${response.status}`)
      }
      const json = (await response.json()) as GraphQLResponse<{
        lendingPoolCreateds?: Page<RawPoolRow>
        tokenReserveFactorSets?: Page<RawReserveFactorRow>
      }>
      if (json.errors) {
        throw new IndexerError('indexer returned GraphQL errors')
      }
      const collection = json.data?.lendingPoolCreateds
      if (!collection || !Array.isArray(collection.items)) {
        throw new IndexerError(
          'indexer response missing lendingPoolCreateds.items',
        )
      }
      // Reserve factors are keyed by router, latest-timestamp wins. The query
      // orders by timestamp desc, so the first row seen per router is the newest.
      // A missing/absent collection is not fatal — pools default to `0n`.
      const reserves = json.data?.tokenReserveFactorSets
      const rows = reserves?.items ?? []
      const reserveByRouter = new Map<string, bigint>()
      for (const row of rows) {
        const key = row.lendingPool.toLowerCase()
        if (!reserveByRouter.has(key)) {
          reserveByRouter.set(key, BigInt(row.reserveFactor || '0'))
        }
      }
      // The page is bounded, so a pool whose only row fell off the end would
      // silently default to a 0 reserve factor — overstating its supply APY.
      // Say so rather than render a number nothing checked.
      if (
        reserves?.totalCount !== undefined &&
        reserves.totalCount > rows.length
      ) {
        console.error(
          `[indexer] reserve-factor page truncated (${rows.length} of ${reserves.totalCount}); some pools may report an overstated supply APY`,
        )
      }
      return collection.items.map((r) => mapRawPool(r, reserveByRouter))
    },

    async getUserHistory(user) {
      const data = await graphql<HistoryData>(url, USER_HISTORY_QUERY, { user })
      if (!data) return []
      const events: HistoryEvent[] = [
        ...items(data.supplyLiquiditys).map((e) =>
          activityToEvent('supply', e),
        ),
        ...items(data.withdrawLiquiditys).map((e) =>
          activityToEvent('withdraw', e),
        ),
        ...items(data.borrowDebts).map((e) => activityToEvent('borrow', e)),
        ...items(data.repayByPositions).map((e) => activityToEvent('repay', e)),
        ...items(data.liquidations).map((e) =>
          toHistoryEvent('liquidation', {
            id: e.id,
            pool: e.lendingPoolAddress,
            token: e.borrowToken,
            amount: e.userBorrowAssets,
            timestamp: e.timestamp,
            txHash: e.txHash,
          }),
        ),
        ...items(data.borrowDebtCrossChains).map((e) =>
          activityToEvent('crosschain', e),
        ),
      ]
      return events.sort((a, b) => b.timestamp - a.timestamp)
    },

    async getProtocolAggregates(): Promise<ProtocolAggregates> {
      const data = await graphql<{
        supplyLiquiditys?: { totalCount?: number }
        withdrawLiquiditys?: { totalCount?: number }
        borrowDebts?: { totalCount?: number }
        repayByPositions?: { totalCount?: number }
        liquidations?: { totalCount?: number }
      }>(url, PROTOCOL_AGGREGATES_QUERY, {})
      if (!data) return EMPTY_AGGREGATES
      const transactionCount =
        (data.supplyLiquiditys?.totalCount ?? 0) +
        (data.withdrawLiquiditys?.totalCount ?? 0) +
        (data.borrowDebts?.totalCount ?? 0) +
        (data.repayByPositions?.totalCount ?? 0) +
        (data.liquidations?.totalCount ?? 0)
      return { ...EMPTY_AGGREGATES, transactionCount }
    },

    async getCrossChainStatus(messageId): Promise<CrossChainStatus> {
      const data = await graphql<{ crossChainTransfers?: Page<CrossChainRow> }>(
        url,
        CROSS_CHAIN_STATUS_QUERY,
        { messageId },
      )
      // `.at(0)` (not `[0]`) so the empty-result case is typed, not just guarded.
      const row = items(data?.crossChainTransfers).at(0)
      const status =
        row && (row.inboundTxHash || row.inboundAt) ? 'delivered' : 'pending'
      return { messageId, status }
    },

    async getRateHistory(pool): Promise<RatePoint[]> {
      const data = await graphql<{
        lendingPoolRateSnapshots?: Page<RateSnapshotRow>
      }>(url, RATE_HISTORY_QUERY, { pool })
      return items(data?.lendingPoolRateSnapshots).map((r) => ({
        timestamp: Number(r.timestamp || 0),
        borrowApr: wadToPercent(BigInt(r.borrowApy || '0')),
        supplyApy: wadToPercent(BigInt(r.supplyApy || '0')),
      }))
    },
    // The indexer does not persist a liquidity time-series yet (rate snapshots
    // carry no totals), so this is empty in live mode and the chart falls back
    // to a current-value indicator (KTD4). Wire a query here once the backend
    // adds a liquidity-snapshot entity.
    getLiquidityHistory: () => Promise.resolve([]),
  }
}

/** Raw `lendingPoolCreateds` row exactly as the indexer serialises it. */
interface RawPoolRow {
  lendingPool: string
  collateralToken: string
  collateralTokenFormatted: string
  borrowToken: string
  borrowTokenFormatted: string
  ltv: string
  baseRate: string
  rateAtOptimal: string
  optimalUtilization: string
  maxUtilization: string
  maxRate: string
  liquidationThreshold: string
  liquidationBonus: string
  sharesToken: string
  router: string
  contractChainId: number
}

/** Raw `tokenReserveFactorSets` row — `lendingPool` here holds the router. */
interface RawReserveFactorRow {
  lendingPool: string
  reserveFactor: string
  timestamp: number | string
}

function mapRawPool(
  r: RawPoolRow,
  reserveByRouter: Map<string, bigint>,
): RawPool {
  return {
    lendingPool: r.lendingPool as Address,
    collateralToken: r.collateralToken as Address,
    collateralTokenFormatted: r.collateralTokenFormatted,
    borrowToken: r.borrowToken as Address,
    borrowTokenFormatted: r.borrowTokenFormatted,
    ltv: BigInt(r.ltv || '0'),
    baseRate: BigInt(r.baseRate || '0'),
    rateAtOptimal: BigInt(r.rateAtOptimal || '0'),
    optimalUtilization: BigInt(r.optimalUtilization || '0'),
    maxUtilization: BigInt(r.maxUtilization || '0'),
    maxRate: BigInt(r.maxRate || '0'),
    liquidationThreshold: BigInt(r.liquidationThreshold || '0'),
    liquidationBonus: BigInt(r.liquidationBonus || '0'),
    sharesToken: r.sharesToken as Address,
    router: r.router as Address,
    reserveFactorWad: reserveByRouter.get(r.router.toLowerCase()) ?? 0n,
    contractChainId: r.contractChainId,
  }
}
