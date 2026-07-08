/**
 * Indexer-adapter fixtures (U3). History + protocol aggregates behind the mock
 * `IndexerAdapter`, shaped after the subgraph entities in INTEGRATION-INDEXER.md
 * so the real swap (U19) is drop-in. TVL/utilization are intentionally absent —
 * those come from the chain adapter (R13), never the indexer.
 */
import { MARKETS, TOKENS } from '#/lib/contracts'
import type { HistoryEvent, ProtocolAggregates } from '../types'

const PXWHSK = MARKETS[0]

/** Recent activity for the preview user, newest first. */
export const HISTORY_FIXTURES: HistoryEvent[] = [
  {
    id: 'evt-1',
    action: 'supply',
    pool: PXWHSK.pool,
    marketId: PXWHSK.id,
    amount: 8_200n * 10n ** 18n,
    token: PXWHSK.collateralAddress,
    tokenSymbol: 'pxWHSK',
    decimals: 18,
    timestamp: 1_720_000_000,
    txHash: '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
  },
  {
    id: 'evt-2',
    action: 'borrow',
    pool: PXWHSK.pool,
    marketId: PXWHSK.id,
    amount: 3_000_000_000n, // 3,000 pxUSDT (6dp)
    token: TOKENS.pxUSDT.address,
    tokenSymbol: 'pxUSDT',
    decimals: 6,
    timestamp: 1_720_050_000,
    txHash: '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
  },
  {
    id: 'evt-3',
    action: 'repay',
    pool: PXWHSK.pool,
    marketId: PXWHSK.id,
    amount: 500_000_000n, // 500 pxUSDT
    token: TOKENS.pxUSDT.address,
    tokenSymbol: 'pxUSDT',
    decimals: 6,
    timestamp: 1_720_100_000,
    txHash: '0xc3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3',
  },
]

export const PROTOCOL_AGGREGATES: ProtocolAggregates = {
  cumulativeVolumeUsd: 48_200_000,
  totalBorrowsUsd: 8_328_000,
  totalSuppliesUsd: 16_740_000,
  transactionCount: 12_483,
}
