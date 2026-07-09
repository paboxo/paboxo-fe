/**
 * Live `IndexerAdapter` (U4) — the real GraphQL subgraph implementation the
 * prior integration plan deferred (U19). A typed `fetch` wrapper runs the
 * authored queries and maps subgraph entities to the domain models the mock
 * produces, so the UI is unchanged across the swap. Every method degrades to an
 * empty/zero result on a network error or malformed response rather than throwing.
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
} from '../types'
import {
  CROSS_CHAIN_STATUS_QUERY,
  PROTOCOL_AGGREGATES_QUERY,
  RATE_HISTORY_QUERY,
  USER_HISTORY_QUERY,
} from './queries'

interface GraphQLResponse<T> {
  data?: T
  errors?: unknown
}

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

interface RawEvent {
  id: string
  pool: string
  token: string
  amount: string
  timestamp: string
  txHash: string
}

function toHistoryEvent(raw: RawEvent, action: HistoryAction): HistoryEvent {
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

interface HistoryData {
  supplies?: RawEvent[]
  borrows?: RawEvent[]
  repays?: RawEvent[]
  withdraws?: RawEvent[]
  liquidations?: RawEvent[]
  crossChainTransfers?: RawEvent[]
}

export function createLiveIndexerAdapter(url: string): IndexerAdapter {
  return {
    async getUserHistory(user) {
      const data = await graphql<HistoryData>(url, USER_HISTORY_QUERY, { user })
      if (!data) return []
      const events: HistoryEvent[] = [
        ...(data.supplies ?? []).map((e) => toHistoryEvent(e, 'supply')),
        ...(data.borrows ?? []).map((e) => toHistoryEvent(e, 'borrow')),
        ...(data.repays ?? []).map((e) => toHistoryEvent(e, 'repay')),
        ...(data.withdraws ?? []).map((e) => toHistoryEvent(e, 'withdraw')),
        ...(data.liquidations ?? []).map((e) =>
          toHistoryEvent(e, 'liquidation'),
        ),
        ...(data.crossChainTransfers ?? []).map((e) =>
          toHistoryEvent(e, 'crosschain'),
        ),
      ]
      return events.sort((a, b) => b.timestamp - a.timestamp)
    },

    async getProtocolAggregates(): Promise<ProtocolAggregates> {
      const data = await graphql<{ protocol: ProtocolAggregates | null }>(
        url,
        PROTOCOL_AGGREGATES_QUERY,
        {},
      )
      return data?.protocol ?? EMPTY_AGGREGATES
    },

    async getCrossChainStatus(messageId): Promise<CrossChainStatus> {
      const data = await graphql<{
        crossChainTransfer: { status: string } | null
      }>(url, CROSS_CHAIN_STATUS_QUERY, { messageId })
      const status =
        data?.crossChainTransfer?.status === 'delivered'
          ? 'delivered'
          : 'pending'
      return { messageId, status }
    },

    async getRateHistory(pool): Promise<RatePoint[]> {
      const data = await graphql<{
        lendingPoolRates?: {
          timestamp: string
          borrowRate: string
          supplyRate: string
        }[]
      }>(url, RATE_HISTORY_QUERY, { pool })
      if (!data?.lendingPoolRates) return []
      return data.lendingPoolRates.map((r) => ({
        timestamp: Number(r.timestamp || 0),
        borrowApr: wadToPercent(BigInt(r.borrowRate || '0')),
        supplyApy: wadToPercent(BigInt(r.supplyRate || '0')),
      }))
    },
  }
}
