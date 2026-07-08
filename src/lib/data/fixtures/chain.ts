/**
 * Chain-adapter fixtures (U3). Coherent-enough preview data behind the mock
 * `ChainAdapter`; the illustrative totals/rates get replaced by real RPC reads
 * in U18. All amounts are raw on-chain units (bigint).
 */
import type { Address } from '#/lib/contracts'
import { MARKETS, TOKENS } from '#/lib/contracts'
import type { LiquidatableStatus, MarketTotals } from '../types'

/** The preview user whose position the dashboard renders. */
export const MOCK_USER: Address = '0x1111111111111111111111111111111111111111'

const WAD = 10n ** 18n
/** pxUSDT (borrow token) has 6 decimals. */
const usdt6 = (whole: number): bigint => BigInt(Math.round(whole * 1e6))

interface PoolFixture {
  totals: MarketTotals
  /** Borrow rate, WAD. */
  borrowRateWad: bigint
}

/** Keyed by lowercased pool address (unknown pool → undefined). */
export const POOL_FIXTURES: Record<string, PoolFixture | undefined> = {
  // pxWHSK — util ≈ 61%
  '0xb45693e9f28ceb47fc3c81b45535e3d808196406': {
    totals: {
      totalSupplyAssets: usdt6(2_600_000),
      totalBorrowAssets: usdt6(1_586_000),
      totalBorrowShares: usdt6(1_500_000),
      totalSupplyShares: usdt6(2_600_000),
    },
    borrowRateWad: (7n * WAD) / 100n,
  },
  // pxWBTC — util ≈ 44%
  '0xc6fa92dfdabd64e0605e479b5cab3696b5d17270': {
    totals: {
      totalSupplyAssets: usdt6(9_800_000),
      totalBorrowAssets: usdt6(4_312_000),
      totalBorrowShares: usdt6(4_200_000),
      totalSupplyShares: usdt6(9_800_000),
    },
    borrowRateWad: (4n * WAD) / 100n,
  },
  // pxWETH — util ≈ 52%
  '0xf1a061db3c2f3985faa1ca178c3cf677b934942d': {
    totals: {
      totalSupplyAssets: usdt6(3_100_000),
      totalBorrowAssets: usdt6(1_612_000),
      totalBorrowShares: usdt6(1_560_000),
      totalSupplyShares: usdt6(3_100_000),
    },
    borrowRateWad: (4n * WAD) / 100n,
  },
  // pxWHSK cross-chain — util ≈ 66%
  '0xe1ac05a5f188fd90867fe7e5878fa02df9b00dfd': {
    totals: {
      totalSupplyAssets: usdt6(1_240_000),
      totalBorrowAssets: usdt6(818_400),
      totalBorrowShares: usdt6(780_000),
      totalSupplyShares: usdt6(1_240_000),
    },
    borrowRateWad: (8n * WAD) / 100n,
  },
}

/** Feed prices, 8-dp USD (1e8 = $1), keyed by lowercased token address. */
export const PRICE_FIXTURES: Record<string, bigint | undefined> = {
  [TOKENS.pxUSDT.address.toLowerCase()]: 100_000_000n, // $1
  [TOKENS.pxWHSK.address.toLowerCase()]: 5_000_000n, // $0.05
  [TOKENS.pxWBTC.address.toLowerCase()]: 6_000_000_000_000n, // $60,000
  [TOKENS.pxWETH.address.toLowerCase()]: 300_000_000_000n, // $3,000
  // bridged cross-chain pxWHSK collateral
  '0x7c9cf703903680ae5eb6ec2bb2bebb1ec751918a': 5_000_000n, // $0.05
}

/** The preview user's per-pool position (only on the pxWHSK market). */
export interface UserPoolState {
  borrowShares: bigint
  supplyShares: bigint
  /** Borrow-token decimals (6dp). */
  maxBorrowAmount: bigint
  collateralValue: bigint
  positionAddr: Address
  liquidatable: LiquidatableStatus
}

const PXWHSK_POOL = '0xb45693e9f28ceb47fc3c81b45535e3d808196406'

export const USER_POOL_STATE: Record<string, UserPoolState | undefined> = {
  [PXWHSK_POOL]: {
    borrowShares: usdt6(3_000),
    supplyShares: 8_200n * WAD, // 8,200 pxWHSK supplied (18dp shares)
    maxBorrowAmount: usdt6(287), // 70% LTV of ~$410 collateral
    collateralValue: usdt6(410),
    positionAddr: '0x2222222222222222222222222222222222222222',
    liquidatable: {
      liquidatable: false,
      borrowValueUsd: 3_152n * WAD,
      maxCollateralValueUsd: 7_600n * WAD,
      bonusUsd: 0n,
    },
  },
}

/** Token balances for the preview user, keyed by lowercased token address. */
export const BALANCE_FIXTURES: Record<string, bigint | undefined> = {
  [TOKENS.pxUSDT.address.toLowerCase()]: usdt6(25_000),
  [TOKENS.pxWHSK.address.toLowerCase()]: 40_000n * WAD,
  [TOKENS.pxWBTC.address.toLowerCase()]: 15_000_000n, // 0.15 pxWBTC (8dp)
  [TOKENS.pxWETH.address.toLowerCase()]: 5n * WAD,
}

/** Every fixture pool corresponds to a real market (guards drift in tests). */
export const FIXTURE_POOLS = MARKETS.map((m) => m.pool.toLowerCase())
