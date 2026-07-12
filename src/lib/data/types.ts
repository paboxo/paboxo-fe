/**
 * The data seam (U3). Every UI hook depends only on these adapter interfaces —
 * never on viem or GraphQL directly — so the mock↔live swap is a registry flip
 * (KTD2). Reads return raw on-chain units (bigint); the math layer converts.
 *
 * `ChainAdapter` = live reads (incl. pool totals) + all writes, via @wagmi/core
 * in the real impl (KTD10). `IndexerAdapter` = history/volume over the subgraph.
 * Two-address rule (R7): writes target the LendingPool; accounting reads resolve
 * `LendingPool(pool).router()` at runtime inside the adapter.
 */
import type { Address } from '#/lib/contracts'

export type Hash = `0x${string}`

// ---------------------------------------------------------------- read shapes

/** Live pool totals — read from the router via RPC (not emitted as events). */
export interface MarketTotals {
  /** Borrow-token units (pxUSDT, 6dp). */
  totalSupplyAssets: bigint
  totalBorrowAssets: bigint
  /** Share units (18dp). */
  totalBorrowShares: bigint
  /** Derived: `sharesToken.totalSupply() * 10^underlyingDecimals / 1e18`. */
  totalSupplyShares: bigint
}

export interface PriceData {
  /** 8-dp USD (1e8 = $1). */
  price: bigint
  /** Unix seconds of the feed's last update; > 1h old is stale (blocks writes). */
  updatedAt: number
}

/** A market's interest-rate-model parameters — the two-slope (kinked) curve.
 *  All rates and utilizations are WAD (1e18 = 100%). */
export interface IrmParams {
  /** Borrow rate at 0% utilization. */
  baseRateWad: bigint
  /** Borrow rate at the optimal utilization (the kink). */
  rateAtOptimalWad: bigint
  /** Borrow rate at the max utilization (top of the steep slope). */
  maxRateWad: bigint
  /** Utilization at the kink (slope1 → slope2). */
  optimalUtilWad: bigint
  /** Utilization at which the rate reaches maxRate (flat above it). */
  maxUtilWad: bigint
}

/** `IsHealthy.checkLiquidatable` — all USD values are 1e18-scaled. */
export interface LiquidatableStatus {
  liquidatable: boolean
  borrowValueUsd: bigint
  maxCollateralValueUsd: bigint
  bonusUsd: bigint
}

// -------------------------------------------------- write param structs (§9)

export interface BorrowParams {
  amount: bigint
  /** 177 for same-chain; a different id routes the CCIP path. */
  chainId: bigint
  destGasLimit: number
}

export interface RepayParams {
  user: Address
  token: Address
  /** Debt shares to repay (convert an asset amount via the math layer). */
  shares: bigint
  amountOutMinimum: bigint
  /** Mode C sells the user's collateral; A/B pay from the wallet. */
  fromPosition: boolean
  /** DEX fee tier — 0 for mode A, e.g. 1000 (0.1%) for swap modes. */
  fee: number
}

export interface CreatePoolParams {
  collateralToken: Address
  borrowToken: Address
  /** Loan-to-value, WAD (1e18 = 100%). */
  ltv: bigint
  /** Initial seed liquidity — must be ≥ `minAmountSupplyLiquidity`. */
  seedAmount: bigint
}

/** Swap tokens held inside a position via the DEX (trade collateral). */
export interface SwapParams {
  tokenIn: Address
  tokenOut: Address
  amountIn: bigint
  /** Slippage floor — must never be 0 (a 0 floor lets the swap fill at any price). */
  amountOutMinimum: bigint
  /** DEX fee tier (e.g. 1000 = 0.1%). */
  fee: number
}

/** CCIP supply action selector on the Base sender: 0 = liquidity, 1 = collateral. */
export type CrossChainAction = 0 | 1

// --------------------------------------------------------------- chain adapter

export interface ChainAdapter {
  // reads
  getMarketTotals: (pool: Address) => Promise<MarketTotals>
  /** Per-market borrow rate, WAD (1e18 = 100%). */
  getBorrowRateWad: (pool: Address) => Promise<bigint>
  /** The market's IRM curve parameters (base/optimal/max rates + utilizations). */
  getIrmParams: (pool: Address) => Promise<IrmParams>
  /** Feed price for a collateral token; the real impl reverts `PriceStale` > 1h. */
  getPrice: (token: Address) => Promise<PriceData>
  /**
   * Batched reads for the whole pool list: balances and rates per pool, prices
   * and verified decimals per registry token. Never rejects — every failure is
   * carried in the result so one bad feed cannot blank the list.
   *
   * `enrichPools([])` is load-bearing, not a no-op: the token map is keyed off
   * the registry, not off `pools`, so an empty list still verifies every token's
   * decimals in one batch. `useTokenDecimals` depends on exactly that. An
   * implementation that short-circuits on `pools.length === 0` breaks it.
   */
  enrichPools: (pools: RawPool[]) => Promise<PoolsEnrichment>
  getUserBorrowShares: (pool: Address, user: Address) => Promise<bigint>
  getUserSupplyShares: (pool: Address, user: Address) => Promise<bigint>
  /** Borrow-token decimals (from HelperUtils). */
  getMaxBorrowAmount: (pool: Address, user: Address) => Promise<bigint>
  getCollateralValue: (pool: Address, user: Address) => Promise<bigint>
  /** 0x0 when the user has no Position yet. */
  getPositionAddress: (pool: Address, user: Address) => Promise<Address>
  checkLiquidatable: (
    pool: Address,
    user: Address,
  ) => Promise<LiquidatableStatus>
  getAllowance: (
    token: Address,
    owner: Address,
    spender: Address,
  ) => Promise<bigint>
  getTokenBalance: (token: Address, user: Address) => Promise<bigint>
  getBorrowDelegation: (
    pool: Address,
    owner: Address,
    delegate: Address,
  ) => Promise<bigint>
  getWithdrawDelegation: (
    pool: Address,
    owner: Address,
    delegate: Address,
  ) => Promise<boolean>
  /** Whether `delegate` may `rebalancePosition` for `owner` (AI agent protection). */
  getRebalanceDelegation: (
    pool: Address,
    owner: Address,
    delegate: Address,
  ) => Promise<boolean>

  // writes — plain awaitable methods; real impl uses @wagmi/core (KTD10)
  approve: (token: Address, spender: Address, amount: bigint) => Promise<Hash>
  supplyLiquidity: (
    pool: Address,
    onBehalf: Address,
    amount: bigint,
  ) => Promise<Hash>
  supplyCollateral: (
    pool: Address,
    onBehalf: Address,
    amount: bigint,
  ) => Promise<Hash>
  borrowDebt: (
    pool: Address,
    params: BorrowParams,
    onBehalf: Address,
  ) => Promise<Hash>
  repayWithSelectedToken: (pool: Address, params: RepayParams) => Promise<Hash>
  withdrawCollateral: (
    pool: Address,
    amount: bigint,
    to: Address,
  ) => Promise<Hash>
  withdrawLiquidity: (
    pool: Address,
    shares: bigint,
    to: Address,
  ) => Promise<Hash>
  liquidation: (pool: Address, borrowers: Address[]) => Promise<Hash>
  /** Swap tokens held in the caller's position (trade collateral) via the DEX. */
  swapCollateral: (pool: Address, params: SwapParams) => Promise<Hash>
  approveBorrowDelegation: (
    pool: Address,
    delegate: Address,
    amount: bigint,
  ) => Promise<Hash>
  approveWithdrawDelegation: (
    pool: Address,
    delegate: Address,
    allowed: boolean,
  ) => Promise<Hash>
  /** Grant/revoke `delegate`'s right to `rebalancePosition` (AI agent protection). */
  approveRebalanceDelegation: (
    pool: Address,
    delegate: Address,
    allowed: boolean,
  ) => Promise<Hash>
  createLendingPool: (
    params: CreatePoolParams,
  ) => Promise<{ hash: Hash; pool: Address }>

  /** Wait for a submitted tx to be mined before a caller advances to `confirmed`.
   *  A write returns as soon as the tx is *broadcast* (it yields a hash), not when
   *  it is confirmed — the mock resolves immediately, the real impl calls
   *  `waitForTransactionReceipt` (KTD10). */
  waitForReceipt: (hash: Hash) => Promise<void>

  // cross-chain (Base side) — mock-only until PaboxoCCIPSender ships on Base
  quoteCrossChainSupply: (
    pool: Address,
    action: CrossChainAction,
    token: Address,
    amount: bigint,
    destGasLimit: number,
  ) => Promise<bigint>
  supplyToHashKey: (
    pool: Address,
    action: CrossChainAction,
    token: Address,
    amount: bigint,
    destGasLimit: number,
    fee: bigint,
  ) => Promise<Hash>
}

// ------------------------------------------------------------- indexer adapter

export type HistoryAction =
  'supply' | 'withdraw' | 'borrow' | 'repay' | 'liquidation' | 'crosschain'

export interface HistoryEvent {
  id: string
  action: HistoryAction
  pool: Address
  marketId: string
  amount: bigint
  token: Address
  tokenSymbol: string
  decimals: number
  /** Unix seconds. */
  timestamp: number
  txHash: Hash
}

/** Aggregates the indexer owns. TVL/utilization are NOT here — those come from
 *  the chain adapter (live pool totals, R13), never the indexer. */
export interface ProtocolAggregates {
  cumulativeVolumeUsd: number
  totalBorrowsUsd: number
  totalSuppliesUsd: number
  transactionCount: number
}

export interface CrossChainStatus {
  messageId: Hash
  /** `pending` until the destination `InboundSupply` fires (R27). */
  status: 'pending' | 'delivered'
}

/** A point on a market's rate history, for charts. Rates are display percents. */
export interface RatePoint {
  /** Unix seconds. */
  timestamp: number
  borrowApr: number
  supplyApy: number
}

/** A point on a market's liquidity history (available liquidity, USD), for charts. */
export interface LiquidityPoint {
  /** Unix seconds. */
  timestamp: number
  liquidityUsd: number
}

/** A point on a user's supplied-value history for one pool (USD), for the
 *  portfolio supply-over-time chart. Buckets are DAILY. */
export interface SupplyPoint {
  /** Unix seconds (start of the day bucket). */
  timestamp: number
  suppliedUsd: number
}

/**
 * A lending market exactly as the indexer emits it (`lendingPoolCreateds`).
 * Addresses stay `Address`; risk/rate params stay raw WAD `bigint` (1e18 = 100%);
 * the display symbols are the indexer's `*Formatted` fields. The domain/market
 * layer converts these — this is the untouched wire shape.
 */
export interface RawPool {
  /** The LendingPool address (writes target this). */
  lendingPool: Address
  collateralToken: Address
  /** Display symbol, e.g. `pxWHSK` or the cross-chain `pxWHSK-xc`. */
  collateralTokenFormatted: string
  borrowToken: Address
  borrowTokenFormatted: string
  /** Loan-to-value, WAD. */
  ltv: bigint
  /** Borrow rate at 0% utilization, WAD. */
  baseRate: bigint
  /** Borrow rate at the optimal utilization (the kink), WAD. */
  rateAtOptimal: bigint
  /** Utilization at the kink, WAD. */
  optimalUtilization: bigint
  /** Utilization at which the rate reaches maxRate, WAD. */
  maxUtilization: bigint
  /** Borrow rate at the max utilization, WAD. */
  maxRate: bigint
  /** Liquidation threshold, WAD. */
  liquidationThreshold: bigint
  /** Liquidation bonus, WAD. */
  liquidationBonus: bigint
  sharesToken: Address
  /** The accounting router for this market (`LendingPool(pool).router()`). */
  router: Address
  /**
   * Reserve factor, WAD (1e18 = 100%). Not emitted on `lendingPoolCreated` — it
   * comes from the `tokenReserveFactorSets` table keyed by the pool's *router*
   * (latest-timestamp-wins), and feeds `supplyRateWad`. `0n` when no row exists.
   */
  reserveFactorWad: bigint
  contractChainId: number
}

// -------------------------------------------------------- batched enrichment

/**
 * A token's decimals, checked at runtime against the static registry.
 *
 * A `decimals()` that *reverts* is as untrustworthy as one that disagrees — it
 * never "differs", so a naive mismatch check would silently keep using the
 * unverified constant. Both invalid shapes drop the token.
 */
export type VerifiedDecimals =
  | { valid: true; decimals: number }
  | { valid: false; reason: 'mismatch'; registry: number; onChain: number }
  | { valid: false; reason: 'unreadable'; registry: number }

/** A feed price. Unavailable when `latestRoundData` reverts — usually `PriceStale`. */
export type TokenPrice =
  { available: true; data: PriceData } | { available: false }

export interface TokenEnrichment {
  decimals: VerifiedDecimals
  price: TokenPrice
}

/**
 * A pool's size. Unknown when its router or a balance read reverts — a transport
 * problem, not a reason to hide the pool (it renders with em dashes instead).
 */
export type PoolSize =
  | {
      known: true
      totalSupplyAssets: bigint
      totalBorrowAssets: bigint
      borrowRateWad: bigint
    }
  | { known: false }

export interface PoolEnrichment {
  pool: Address
  size: PoolSize
}

/** The result of one `enrichPools` call. Both maps are keyed by lowercased address. */
export interface PoolsEnrichment {
  pools: Record<string, PoolEnrichment>
  tokens: Record<string, TokenEnrichment>
}

export interface IndexerAdapter {
  /**
   * The live lending markets. Unlike the other reads this REJECTS on any indexer
   * fault (network error, non-OK response, GraphQL `errors`, or a malformed
   * body) so an outage renders an error state rather than a false "no pools".
   * It resolves `[]` only for a well-formed empty result.
   */
  getPools: () => Promise<RawPool[]>
  getUserHistory: (user: Address) => Promise<HistoryEvent[]>
  getProtocolAggregates: () => Promise<ProtocolAggregates>
  getCrossChainStatus: (messageId: Hash) => Promise<CrossChainStatus>
  getRateHistory: (pool: Address) => Promise<RatePoint[]>
  /** Liquidity-over-time series. Empty until the indexer persists liquidity
   *  snapshots — consumers then fall back to a current-value indicator (KTD4). */
  getLiquidityHistory: (pool: Address) => Promise<LiquidityPoint[]>
  /** A user's DAILY supplied-value series for one pool (USD). Empty until the
   *  indexer persists per-user supply snapshots; the chart shows its empty
   *  state until then. Mock mode returns a plausible daily series. */
  getUserSupplyHistory: (user: Address, pool: Address) => Promise<SupplyPoint[]>
}
