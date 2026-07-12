/**
 * GraphQL documents for the live Ponder indexer at `VITE_INDEXER_URL`.
 *
 * The endpoint is Ponder-shaped: every table is pluralised and wraps its rows in
 * an `items` array, and root-collection args are `where` / `orderBy` /
 * `orderDirection` / `limit` (there is no `first`, and no protocol singleton or
 * rate-history collection — the earlier documents were written against a schema
 * that never shipped). `orderBy` takes a field name as a string; `orderDirection`
 * is `"asc"` / `"desc"`.
 *
 * Note: live pool totals (totalSupply/BorrowAssets) come from the router via RPC
 * (chain adapter), so protocol TVL/utilization never come from these queries.
 */

/**
 * The live lending markets (`lendingPoolCreateds`). Drives `getPools`.
 *
 * The reserve factor is NOT on `lendingPoolCreated`; it lives in
 * `tokenReserveFactorSets`, keyed by the pool's **router** address (that table's
 * `lendingPool` field actually holds the router), WAD-scaled, latest-timestamp
 * wins. Selected in the same document so `getPools` still issues one request and
 * keeps its reject-on-fault contract.
 */
export const POOLS_QUERY = /* GraphQL */ `
  query Pools($chainId: Int = 177, $reserveLimit: Int = 1000) {
    lendingPoolCreateds(where: { contractChainId: $chainId }) {
      items {
        id
        lendingPool
        collateralToken
        borrowToken
        collateralTokenFormatted
        borrowTokenFormatted
        ltv
        baseRate
        rateAtOptimal
        optimalUtilization
        maxUtilization
        maxRate
        liquidationThreshold
        liquidationBonus
        sharesToken
        router
        contractChainId
      }
    }
    # Scoped and bounded: this table grows one row per setReserveFactor call,
    # forever. \`totalCount\` lets the caller notice truncation instead of
    # silently defaulting a pool's reserve factor to 0 — which would overstate
    # its supply APY.
    tokenReserveFactorSets(
      where: { contractChainId: $chainId }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $reserveLimit
    ) {
      totalCount
      items {
        lendingPool
        reserveFactor
        timestamp
      }
    }
  }
`

/** A user's activity across supply/withdraw/borrow/repay/liquidation/cross-chain. */
export const USER_HISTORY_QUERY = /* GraphQL */ `
  query UserHistory($user: String!, $limit: Int = 50) {
    supplyLiquiditys(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        amount
        timestamp
        txHash
      }
    }
    withdrawLiquiditys(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        amount
        timestamp
        txHash
      }
    }
    borrowDebts(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        amount
        timestamp
        txHash
      }
    }
    repayByPositions(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        amount
        timestamp
        txHash
      }
    }
    liquidations(
      where: { borrower: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        borrowToken
        userBorrowAssets
        timestamp
        txHash
      }
    }
    borrowDebtCrossChains(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "desc"
      limit: $limit
    ) {
      items {
        id
        lendingPoolAddress
        amount
        timestamp
        txHash
      }
    }
  }
`

/**
 * A user's balance-changing events for the position-history chart: lender
 * liquidity, collateral, and debt (both directions each). Filtered by pool
 * client-side; each row carries the pool, amount, and timestamp.
 */
export const USER_POSITION_HISTORY_QUERY = /* GraphQL */ `
  query UserPositionHistory($user: String!, $limit: Int = 500) {
    supplyLiquiditys(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
    withdrawLiquiditys(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
    supplyCollaterals(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
    withdrawCollaterals(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
    borrowDebts(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
    repayByPositions(
      where: { user: $user }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        lendingPoolAddress
        amount
        timestamp
      }
    }
  }
`

/**
 * Protocol activity counts. There is no aggregates entity in this schema, so the
 * only indexer-owned figure is a transaction count summed from the activity
 * tables' `totalCount`; USD volumes come from elsewhere and stay 0 here.
 */
export const PROTOCOL_AGGREGATES_QUERY = /* GraphQL */ `
  query ProtocolAggregates {
    supplyLiquiditys {
      totalCount
    }
    withdrawLiquiditys {
      totalCount
    }
    borrowDebts {
      totalCount
    }
    repayByPositions {
      totalCount
    }
    liquidations {
      totalCount
    }
  }
`

/** Track a cross-chain supply — delivered once its inbound leg lands on HashKey. */
export const CROSS_CHAIN_STATUS_QUERY = /* GraphQL */ `
  query CrossChainStatus($messageId: String!) {
    crossChainTransfers(where: { id: $messageId }, limit: 1) {
      items {
        id
        inboundTxHash
        inboundAt
      }
    }
  }
`

/** A market's borrow/supply APY history for charts (rates are WAD strings). */
export const RATE_HISTORY_QUERY = /* GraphQL */ `
  query RateHistory($pool: String!, $limit: Int = 60) {
    lendingPoolRateSnapshots(
      where: { lendingPool: $pool }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: $limit
    ) {
      items {
        timestamp
        borrowApy
        supplyApy
      }
    }
  }
`
