/**
 * The single swap point (U3). Domain hooks call `getAdapters()` and never import
 * a concrete adapter, so flipping `VITE_DATA_MODE` between `mock` and `live` is
 * the only change needed to go on-chain (KTD2, KTD6). Live impls are stubbed
 * until U18 (chain) and U19 (indexer) land the real viem/GraphQL adapters.
 */
import type { DataMode } from '#/lib/config/env'
import { DATA_MODE } from '#/lib/config/env'
import type { ChainAdapter, IndexerAdapter } from './types'
import { mockChainAdapter } from './chain/chainAdapter.mock'
import { mockIndexerAdapter } from './indexer/indexerAdapter.mock'
import { notImplemented } from './notImplemented'

export interface Adapters {
  chain: ChainAdapter
  indexer: IndexerAdapter
}

const mockAdapters: Adapters = {
  chain: mockChainAdapter,
  indexer: mockIndexerAdapter,
}

const liveAdapters: Adapters = {
  chain: notImplemented<ChainAdapter>('live chainAdapter (U18)'),
  indexer: notImplemented<IndexerAdapter>('live indexerAdapter (U19)'),
}

/** Pure resolver — takes the mode explicitly so it is trivially testable. */
export function resolveAdapters(mode: DataMode): Adapters {
  return mode === 'live' ? liveAdapters : mockAdapters
}

/** The app-wide accessor, bound to the build-time `VITE_DATA_MODE`. */
export function getAdapters(): Adapters {
  return resolveAdapters(DATA_MODE)
}
