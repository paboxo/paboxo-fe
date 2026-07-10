/**
 * The shared pre-flight gate (U4, KTD5). Every write hook runs its action
 * through one of these before building a transaction, so a tx that would revert
 * is blocked in the UI with a human reason instead. Functions are pure — the
 * caller feeds live values read from `chainAdapter`; nothing here reads the chain
 * itself, which keeps the revert conditions unit-testable.
 *
 * Encodes R9/R10: health, max-borrow, available liquidity, mint-≥1-share, price
 * freshness (>1h stale), delegation, and liquidatable status.
 */
import { supplySharesForAssets } from '#/lib/math'

/** Feeds go stale after 1h — `TokenDataStream.latestRoundData` then reverts. */
export const PRICE_MAX_AGE_SECONDS = 3600

export interface PreflightResult {
  enabled: boolean
  reason?: string
}

const OK: PreflightResult = { enabled: true }
const block = (reason: string): PreflightResult => ({ enabled: false, reason })

/** First failing check, or OK if all pass. */
function firstBlock(...checks: PreflightResult[]): PreflightResult {
  return checks.find((check) => !check.enabled) ?? OK
}

export function isPriceStale(updatedAt: number, nowSeconds: number): boolean {
  return nowSeconds - updatedAt > PRICE_MAX_AGE_SECONDS
}

/** Current unix seconds — the `nowSeconds` a caller feeds the freshness checks. */
export function unixNow(): number {
  return Math.floor(Date.now() / 1000)
}

// ---- primitive checks ----

const positiveAmount = (amount: bigint): PreflightResult =>
  amount > 0n ? OK : block('Enter an amount greater than zero')

const freshPrice = (updatedAt: number, nowSeconds: number): PreflightResult =>
  isPriceStale(updatedAt, nowSeconds)
    ? block(
        'Price feed is stale (older than 1h) — wait for the oracle to update',
      )
    : OK

// ---- per-action gates ----

export interface SupplyContext {
  amount: bigint
  totalSupplyAssets: bigint
  totalSupplyShares: bigint
  priceUpdatedAt: number
  nowSeconds: number
}

/** Supply liquidity/collateral: positive amount, fresh price, mints ≥ 1 share. */
export function preflightSupply(ctx: SupplyContext): PreflightResult {
  const mints = supplySharesForAssets(
    ctx.amount,
    ctx.totalSupplyAssets,
    ctx.totalSupplyShares,
  )
  return firstBlock(
    positiveAmount(ctx.amount),
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
    mints > 0n
      ? OK
      : block('Amount too small to mint a share — increase the amount'),
  )
}

export interface SupplyCollateralContext {
  amount: bigint
  priceUpdatedAt: number
  nowSeconds: number
}

/** Supply collateral: positive amount on a fresh price (collateral is not
 *  share-minted, so the mint-≥1-share rule does not apply). */
export function preflightSupplyCollateral(
  ctx: SupplyCollateralContext,
): PreflightResult {
  return firstBlock(
    positiveAmount(ctx.amount),
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
  )
}

export interface BorrowContext {
  amount: bigint
  /** Live `getMaxBorrowAmount`, borrow-token decimals. */
  maxBorrowAmount: bigint
  /** Live `totalSupplyAssets − totalBorrowAssets`. */
  availableLiquidity: bigint
  priceUpdatedAt: number
  nowSeconds: number
  /** For a third-party (on-behalf) borrow: the borrower's delegation to caller. */
  onBehalf?: boolean
  hasDelegation?: boolean
}

/** Borrow: validated against live max-borrow AND available liquidity — a borrow
 *  under max-borrow is still blocked when the pool can't fund it (AE3). A
 *  delegated borrow requires prior `approveBorrowDelegation` (AE5). */
export function preflightBorrow(ctx: BorrowContext): PreflightResult {
  return firstBlock(
    positiveAmount(ctx.amount),
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
    ctx.amount <= ctx.maxBorrowAmount
      ? OK
      : block('Amount exceeds your borrowing power for this market'),
    ctx.amount <= ctx.availableLiquidity
      ? OK
      : block('Not enough available liquidity in the pool right now'),
    ctx.onBehalf && !ctx.hasDelegation
      ? block('The borrower has not granted you borrow delegation')
      : OK,
  )
}

export interface WithdrawContext {
  amount: bigint
  /** Live debt this withdrawal must leave covered. */
  currentDebt: bigint
  /** Live max-borrow the position would still support post-withdraw. */
  maxBorrowAfterWithdraw: bigint
  priceUpdatedAt: number
  nowSeconds: number
}

/** Withdraw collateral: positive amount, fresh price, and the position stays
 *  healthy afterward (debt ≤ post-withdraw borrowing power). Pool-liquidity is
 *  not a factor for collateral — that gate applies to liquidity withdrawal. */
export function preflightWithdraw(ctx: WithdrawContext): PreflightResult {
  return firstBlock(
    positiveAmount(ctx.amount),
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
    ctx.currentDebt <= ctx.maxBorrowAfterWithdraw
      ? OK
      : block('Withdrawing this much would make your position unhealthy'),
  )
}

export interface RepayContext {
  amount: bigint
  shares: bigint
}

/** Repay: a positive amount resolving to at least one debt share. */
export function preflightRepay(ctx: RepayContext): PreflightResult {
  return firstBlock(
    positiveAmount(ctx.amount),
    ctx.shares > 0n ? OK : block('Nothing to repay'),
  )
}

export interface SwapContext {
  amountIn: bigint
  amountOutMinimum: bigint
  priceUpdatedAt: number
  nowSeconds: number
}

/** Swap collateral: positive input, fresh price, and a real slippage floor — a
 *  swap must never be sent with `amountOutMinimum: 0` (fills at any price). */
export function preflightSwap(ctx: SwapContext): PreflightResult {
  return firstBlock(
    ctx.amountIn > 0n ? OK : block('Enter an amount greater than zero'),
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
    ctx.amountOutMinimum > 0n
      ? OK
      : block('Set a slippage tolerance before swapping'),
  )
}

export interface LiquidateContext {
  liquidatable: boolean
  priceUpdatedAt: number
  nowSeconds: number
}

/** Liquidate: only an unhealthy borrower, and only on a fresh price. */
export function preflightLiquidate(ctx: LiquidateContext): PreflightResult {
  return firstBlock(
    freshPrice(ctx.priceUpdatedAt, ctx.nowSeconds),
    ctx.liquidatable
      ? OK
      : block('This position is healthy and cannot be liquidated'),
  )
}
