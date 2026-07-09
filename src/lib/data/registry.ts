/**
 * The single swap point (U3). Domain hooks call `getAdapters()` and never import
 * a concrete adapter, so flipping `VITE_DATA_MODE` between `mock` and `live` is
 * the only change needed to go on-chain (KTD2, KTD6). Live chain reads/writes go
 * through the real viem adapter (U18); the live indexer is the real GraphQL
 * adapter (U4) when `VITE_INDEXER_URL` is set, otherwise it falls back to the
 * mock (the subgraph is not deployed yet).
 */
import type { DataMode } from '#/lib/config/env'
import { DATA_MODE, INDEXER_URL } from '#/lib/config/env'
import type { ChainAdapter, IndexerAdapter } from './types'
import { mockChainAdapter } from './chain/chainAdapter.mock'
import { liveChainAdapter } from './chain/chainAdapter'
import { mockIndexerAdapter } from './indexer/indexerAdapter.mock'
import { createLiveIndexerAdapter } from './indexer/indexerAdapter'

export interface Adapters {
  chain: ChainAdapter
  indexer: IndexerAdapter
}

const mockAdapters: Adapters = {
  chain: mockChainAdapter,
  indexer: mockIndexerAdapter,
}

const liveAdapters: Adapters = {
  chain: liveChainAdapter,
  // Real GraphQL indexer when an endpoint is configured; mock until it deploys.
  indexer: INDEXER_URL
    ? createLiveIndexerAdapter(INDEXER_URL)
    : mockIndexerAdapter,
}

/** Pure resolver — takes the mode explicitly so it is trivially testable. */
export function resolveAdapters(mode: DataMode): Adapters {
  return mode === 'live' ? liveAdapters : mockAdapters
}

/** The app-wide accessor, bound to the build-time `VITE_DATA_MODE`. */
export function getAdapters(): Adapters {
  return resolveAdapters(DATA_MODE)
}
