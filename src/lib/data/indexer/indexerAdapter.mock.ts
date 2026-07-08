/**
 * Mock `IndexerAdapter` (U3). Serves fixture history + aggregates; the real impl
 * (U19) swaps in the GraphQL subgraph behind this same interface.
 */
import type {
  CrossChainStatus,
  Hash,
  IndexerAdapter,
  ProtocolAggregates,
} from '../types'
import { HISTORY_FIXTURES, PROTOCOL_AGGREGATES } from '../fixtures/indexer'

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
}
