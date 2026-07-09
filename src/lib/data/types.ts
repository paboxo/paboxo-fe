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
  /** Feed price for a collateral token; the real impl reverts `PriceStale` > 1h. */
  getPrice: (token: Address) => Promise<PriceData>
  getUserBorrowShares: (pool: Address, user: Address) => Promise<bigint>
  getUserSupplyShares: (pool: Address, user: Address) => Promise<bigint>
  /** Borrow-token decimals (from HelperUtils). */
  getMaxBorrowAmount: (pool: Address, user: Address) => Promise<bigint>
  getCollateralValue: (pool: Address, user: Address) => Promise<bigint>
  /** 0x0 when the user has no Position yet. */
  getPositionAddress: (pool: Address, user: Address) => Promise<Address>
  checkLiquidatable: (pool: Address, user: Address) => Promise<LiquidatableStatus>
  getAllowance: (token: Address, owner: Address, spender: Address) => Promise<bigint>
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

  // writes — plain awaitable methods; real impl uses @wagmi/core (KTD10)
  approve: (token: Address, spender: Address, amount: bigint) => Promise<Hash>
  supplyLiquidity: (pool: Address, onBehalf: Address, amount: bigint) => Promise<Hash>
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
  withdrawCollateral: (pool: Address, amount: bigint, to: Address) => Promise<Hash>
  withdrawLiquidity: (pool: Address, shares: bigint, to: Address) => Promise<Hash>
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
  createLendingPool: (
    params: CreatePoolParams,
  ) => Promise<{ hash: Hash; pool: Address }>

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
  | 'supply'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'liquidation'
  | 'crosschain'

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

export interface IndexerAdapter {
  getUserHistory: (user: Address) => Promise<HistoryEvent[]>
  getProtocolAggregates: () => Promise<ProtocolAggregates>
  getCrossChainStatus: (messageId: Hash) => Promise<CrossChainStatus>
  getRateHistory: (pool: Address) => Promise<RatePoint[]>
}
