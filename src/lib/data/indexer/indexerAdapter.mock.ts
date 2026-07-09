/**
 * Mock `IndexerAdapter` (U3). Serves fixture history + aggregates; the real impl
 * (U19) swaps in the GraphQL subgraph behind this same interface.
 */
import type { Address } from '#/lib/contracts'
import { MARKETS, getMarketConfig } from '#/lib/contracts'
import type {
  CrossChainStatus,
  Hash,
  IndexerAdapter,
  ProtocolAggregates,
  RatePoint,
} from '../types'
import {
  HISTORY_FIXTURES,
  PROTOCOL_AGGREGATES,
  rateHistoryFixture,
} from '../fixtures/indexer'

export const mockIndexerAdapter: IndexerAdapter = {
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
}
