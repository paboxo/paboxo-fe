/**
 * Mock `IndexerAdapter`. Serves fixture pools/history/aggregates; the real impl
 * swaps in the Ponder GraphQL adapter behind this same interface.
 */
import type { Address } from '#/lib/contracts'
import { MARKETS, getMarketConfig } from '#/lib/contracts'
import type {
  CrossChainStatus,
  Hash,
  IndexerAdapter,
  LiquidityPoint,
  PositionHistory,
  ProtocolAggregates,
  RatePoint,
  RawPool,
} from '../types'
import {
  HISTORY_FIXTURES,
  POOL_FIXTURES,
  PROTOCOL_AGGREGATES,
  liquidityHistoryFixture,
  rateHistoryFixture,
  positionHistoryFixture,
} from '../fixtures/indexer'
import { IndexerError } from './indexerAdapter'

export interface MockIndexerOptions {
  /** When true, `getPools()` rejects — lets a test exercise the outage path. */
  failPools?: boolean
}

export function createMockIndexerAdapter(
  options: MockIndexerOptions = {},
): IndexerAdapter {
  return {
    getPools(): Promise<RawPool[]> {
      if (options.failPools) {
        return Promise.reject(new IndexerError('mock indexer outage'))
      }
      return Promise.resolve([...POOL_FIXTURES])
    },
    getUserHistory() {
      return Promise.resolve([...HISTORY_FIXTURES])
    },
    getProtocolAggregates(): Promise<ProtocolAggregates> {
      return Promise.resolve(PROTOCOL_AGGREGATES)
    },
    getCrossChainStatus(messageId: Hash): Promise<CrossChainStatus> {
      // Preview: report delivered so the two-hop UI can resolve. The live in-flight
      // timing is modeled by the cross-chain hook (U17).
      return Promise.resolve({ messageId, status: 'delivered' })
    },
    getRateHistory(pool: Address): Promise<RatePoint[]> {
      const market =
        MARKETS.find((m) => m.pool.toLowerCase() === pool.toLowerCase()) ??
        getMarketConfig('pxwhsk')
      return Promise.resolve(rateHistoryFixture(market?.rateAtOptimal ?? 7))
    },
    getLiquidityHistory(): Promise<LiquidityPoint[]> {
      return Promise.resolve(liquidityHistoryFixture(1_000_000))
    },
    getUserPositionHistory(
      _user: Address,
      pool: Address,
    ): Promise<PositionHistory> {
      // Base the series on the pool so the cards don't chart identical lines;
      // illustrative until the indexer records real history.
      const market = MARKETS.find(
        (m) => m.pool.toLowerCase() === pool.toLowerCase(),
      )
      const supplyBase = market ? 4_000 + market.id.length * 500 : 5_000
      return Promise.resolve(positionHistoryFixture(supplyBase, 1.5, 1_200))
    },
  }
}

export const mockIndexerAdapter: IndexerAdapter = createMockIndexerAdapter()
