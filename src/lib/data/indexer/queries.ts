/**
 * GraphQL documents for the Paboxo subgraph (U8), authored against the entities
 * in INTEGRATION-INDEXER.md so the real indexer swap (U19) is drop-in. The mock
 * indexer adapter serves fixtures today; the live adapter runs these.
 *
 * Note: live pool totals (totalSupplyAssets/BorrowAssets) are NOT in the
 * subgraph — they are read from the router via RPC (chain adapter), so protocol
 * TVL/utilization never come from these queries (R13).
 */

/** A user's activity across supply/borrow/repay/withdraw/liquidation/cross-chain. */
export const USER_HISTORY_QUERY = /* GraphQL */ `
  query UserHistory($user: Bytes!, $first: Int = 50) {
    supplies(where: { user: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      timestamp
      txHash
    }
    borrows(where: { user: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      timestamp
      txHash
    }
    repays(where: { user: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      timestamp
      txHash
    }
    withdraws(where: { user: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      timestamp
      txHash
    }
    liquidations(where: { borrower: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      timestamp
      txHash
    }
    crossChainTransfers(where: { user: $user }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      pool
      token
      amount
      messageId
      status
      timestamp
      txHash
    }
  }
`

/** Protocol aggregates the indexer owns — cumulative volume + counts (NOT TVL). */
export const PROTOCOL_AGGREGATES_QUERY = /* GraphQL */ `
  query ProtocolAggregates {
    protocol(id: "paboxo") {
      cumulativeVolumeUsd
      totalBorrowsUsd
      totalSuppliesUsd
      transactionCount
    }
  }
`

/** Track a cross-chain supply between its Base send and HashKey delivery. */
export const CROSS_CHAIN_STATUS_QUERY = /* GraphQL */ `
  query CrossChainStatus($messageId: Bytes!) {
    crossChainTransfer(id: $messageId) {
      messageId
      status
    }
  }
`
