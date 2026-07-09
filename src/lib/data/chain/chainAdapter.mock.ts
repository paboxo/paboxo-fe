/**
 * Mock `ChainAdapter` (U3). Returns fixtures for every read and a stub tx hash
 * for every write, so the UI builds against the real interface before U18 wires
 * viem. Writes resolve here; the viem-shaped failure path is exercised at U9.
 */
import type { Address } from '#/lib/contracts'
import { MARKETS } from '#/lib/contracts'
import type {
  BorrowParams,
  ChainAdapter,
  CreatePoolParams,
  Hash,
  IrmParams,
  LiquidatableStatus,
  MarketTotals,
  PriceData,
  RepayParams,
  SwapParams,
} from '../types'
import {
  BALANCE_FIXTURES,
  POOL_FIXTURES,
  PRICE_FIXTURES,
  USER_POOL_STATE,
} from '../fixtures/chain'

// A string literal (not a template) so TS keeps it typed as `0x${string}` = Hash.
const MOCK_TX_HASH: Hash =
  '0xababababababababababababababababababababababababababababababababab'

const EMPTY_TOTALS: MarketTotals = {
  totalSupplyAssets: 0n,
  totalBorrowAssets: 0n,
  totalBorrowShares: 0n,
  totalSupplyShares: 0n,
}

const NOT_LIQUIDATABLE: LiquidatableStatus = {
  liquidatable: false,
  borrowValueUsd: 0n,
  maxCollateralValueUsd: 0n,
  bonusUsd: 0n,
}

const key = (address: Address): string => address.toLowerCase()

/** Simulate a small network round-trip so loading states are reachable. */
function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value)
}

export const mockChainAdapter: ChainAdapter = {
  // ---- reads ----
  getMarketTotals(pool) {
    return resolve(POOL_FIXTURES[key(pool)]?.totals ?? EMPTY_TOTALS)
  },
  getBorrowRateWad(pool) {
    return resolve(POOL_FIXTURES[key(pool)]?.borrowRateWad ?? 0n)
  },
  getIrmParams(pool): Promise<IrmParams> {
    // 1% = 1e16 WAD; utilizations and rates come straight from the market config.
    const pctToWad = (pct: number): bigint => BigInt(Math.round(pct * 1e16))
    const market = MARKETS.find((m) => key(m.pool) === key(pool)) ?? MARKETS[0]
    return resolve({
      baseRateWad: pctToWad(market.baseRate),
      rateAtOptimalWad: pctToWad(market.rateAtOptimal),
      maxRateWad: pctToWad(market.maxRate),
      optimalUtilWad: pctToWad(market.optimalUtil),
      maxUtilWad: pctToWad(market.maxUtil),
    })
  },
  getPrice(token): Promise<PriceData> {
    const price = PRICE_FIXTURES[key(token)]
    if (price === undefined) {
      return Promise.reject(
        new Error(`mockChainAdapter: no price fixture for ${token}`),
      )
    }
    // Always fresh in mock — the staleness gate (U4) drives its own fixture.
    return resolve({ price, updatedAt: Math.floor(Date.now() / 1000) })
  },
  getUserBorrowShares(pool) {
    return resolve(USER_POOL_STATE[key(pool)]?.borrowShares ?? 0n)
  },
  getUserSupplyShares(pool) {
    return resolve(USER_POOL_STATE[key(pool)]?.supplyShares ?? 0n)
  },
  getMaxBorrowAmount(pool) {
    return resolve(USER_POOL_STATE[key(pool)]?.maxBorrowAmount ?? 0n)
  },
  getCollateralValue(pool) {
    return resolve(USER_POOL_STATE[key(pool)]?.collateralValue ?? 0n)
  },
  getPositionAddress(pool) {
    return resolve(
      USER_POOL_STATE[key(pool)]?.positionAddr ??
        ('0x0000000000000000000000000000000000000000'),
    )
  },
  checkLiquidatable(pool) {
    return resolve(USER_POOL_STATE[key(pool)]?.liquidatable ?? NOT_LIQUIDATABLE)
  },
  getAllowance() {
    // No standing allowances in preview — every write prompts an approval.
    return resolve(0n)
  },
  getTokenBalance(token) {
    return resolve(BALANCE_FIXTURES[key(token)] ?? 0n)
  },
  getBorrowDelegation() {
    return resolve(0n)
  },
  getWithdrawDelegation() {
    return resolve(false)
  },

  // ---- writes (stubbed) ----
  approve(_token: Address, _spender: Address, _amount: bigint) {
    return resolve(MOCK_TX_HASH)
  },
  supplyLiquidity(_pool: Address, _onBehalf: Address, _amount: bigint) {
    return resolve(MOCK_TX_HASH)
  },
  supplyCollateral(_pool: Address, _onBehalf: Address, _amount: bigint) {
    return resolve(MOCK_TX_HASH)
  },
  borrowDebt(_pool: Address, _params: BorrowParams, _onBehalf: Address) {
    return resolve(MOCK_TX_HASH)
  },
  repayWithSelectedToken(_pool: Address, _params: RepayParams) {
    return resolve(MOCK_TX_HASH)
  },
  withdrawCollateral(_pool: Address, _amount: bigint, _to: Address) {
    return resolve(MOCK_TX_HASH)
  },
  withdrawLiquidity(_pool: Address, _shares: bigint, _to: Address) {
    return resolve(MOCK_TX_HASH)
  },
  liquidation(_pool: Address, _borrowers: Address[]) {
    return resolve(MOCK_TX_HASH)
  },
  swapCollateral(_pool: Address, _params: SwapParams) {
    return resolve(MOCK_TX_HASH)
  },
  approveBorrowDelegation(_pool: Address, _delegate: Address, _amount: bigint) {
    return resolve(MOCK_TX_HASH)
  },
  approveWithdrawDelegation(
    _pool: Address,
    _delegate: Address,
    _allowed: boolean,
  ) {
    return resolve(MOCK_TX_HASH)
  },
  createLendingPool(_params: CreatePoolParams) {
    return resolve({
      hash: MOCK_TX_HASH,
      pool: '0x3333333333333333333333333333333333333333',
    })
  },

  // ---- cross-chain (mock-only until PaboxoCCIPSender ships on Base) ----
  quoteCrossChainSupply() {
    return resolve(1_000_000_000_000_000n) // 0.001 ETH mock fee
  },
  supplyToHashKey() {
    return resolve(MOCK_TX_HASH)
  },
}
