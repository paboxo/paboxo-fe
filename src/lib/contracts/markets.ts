/**
 * The four live isolated lending markets on HashKey 177 (all borrow pxUSDT).
 * Per-market two-slope IRM tiers keyed by collateral risk (from DEPLOYMENT.md).
 * `router` for each pool is resolved at runtime via LendingPool(pool).router().
 */
import type { Address } from './chains'
import { CROSS_CHAIN, PRICE_FEEDS, TOKENS } from './addresses'

export interface MarketConfig {
  id: string
  pool: Address
  collateralSymbol: string
  collateralAddress: Address
  collateralDecimals: number
  borrowSymbol: 'pxUSDT'
  oracleFeed: Address
  /** Loan-to-value (%) — max borrow against collateral. */
  ltv: number
  /** Liquidation threshold (%) — where the position becomes liquidatable. */
  liqThreshold: number
  optimalUtil: number
  /** Utilization (%) at which the borrow rate reaches maxRate (flat above it). */
  maxUtil: number
  /** Borrow rate (%) at 0% utilization. */
  baseRate: number
  rateAtOptimal: number
  maxRate: number
  reserveFactor: number
  /** Seed price pushed at deploy (real oracle value moves via the keeper). */
  priceSeedUsd: number
  crossChain: boolean
}

export const MARKETS: MarketConfig[] = [
  {
    id: 'pxwhsk',
    pool: '0xB45693e9F28ceb47fC3c81b45535e3D808196406',
    collateralSymbol: 'pxWHSK',
    collateralAddress: TOKENS.pxWHSK.address,
    collateralDecimals: TOKENS.pxWHSK.decimals,
    borrowSymbol: 'pxUSDT',
    oracleFeed: PRICE_FEEDS.pxWHSK.address,
    ltv: 70,
    liqThreshold: 75,
    optimalUtil: 75,
    maxUtil: 90,
    baseRate: 0.5,
    rateAtOptimal: 7,
    maxRate: 120,
    reserveFactor: 15,
    priceSeedUsd: PRICE_FEEDS.pxWHSK.seedUsd,
    crossChain: false,
  },
  {
    id: 'pxwbtc',
    pool: '0xC6FA92DfdaBd64e0605e479b5cab3696b5D17270',
    collateralSymbol: 'pxWBTC',
    collateralAddress: TOKENS.pxWBTC.address,
    collateralDecimals: TOKENS.pxWBTC.decimals,
    borrowSymbol: 'pxUSDT',
    oracleFeed: PRICE_FEEDS.pxWBTC.address,
    ltv: 80,
    liqThreshold: 85,
    optimalUtil: 85,
    maxUtil: 95,
    baseRate: 0,
    rateAtOptimal: 4,
    maxRate: 75,
    reserveFactor: 10,
    priceSeedUsd: PRICE_FEEDS.pxWBTC.seedUsd,
    crossChain: false,
  },
  {
    id: 'pxweth',
    pool: '0xF1a061Db3C2f3985Faa1Ca178c3cF677b934942D',
    collateralSymbol: 'pxWETH',
    collateralAddress: TOKENS.pxWETH.address,
    collateralDecimals: TOKENS.pxWETH.decimals,
    borrowSymbol: 'pxUSDT',
    oracleFeed: PRICE_FEEDS.pxWETH.address,
    ltv: 80,
    liqThreshold: 85,
    optimalUtil: 85,
    maxUtil: 95,
    baseRate: 0,
    rateAtOptimal: 4,
    maxRate: 75,
    reserveFactor: 10,
    priceSeedUsd: PRICE_FEEDS.pxWETH.seedUsd,
    crossChain: false,
  },
  {
    id: 'pxwhsk-xchain',
    pool: '0xE1AC05a5f188fd90867Fe7e5878Fa02Df9b00DFd',
    collateralSymbol: 'pxWHSK',
    // Bridged cross-chain pxWHSK — a different contract from the same-chain token.
    collateralAddress: CROSS_CHAIN.bridgeToken.hashkey,
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    oracleFeed: PRICE_FEEDS['pxWHSK-xchain'].address,
    ltv: 65,
    liqThreshold: 72,
    optimalUtil: 70,
    maxUtil: 90,
    baseRate: 0.5,
    rateAtOptimal: 8,
    maxRate: 150,
    reserveFactor: 15,
    priceSeedUsd: PRICE_FEEDS['pxWHSK-xchain'].seedUsd,
    crossChain: true,
  },
]

/**
 * Resolve a market by either identity in circulation.
 *
 * `MarketConfig.id` is a human slug (`pxwhsk`), but `MarketView.id` is now the
 * lowercased pool address — the routable identity the indexer supplies. Callers
 * hold one or the other depending on which layer they came from, so match both.
 * Matching only the slug silently disabled `useMarketPosition`, which capped the
 * Withdraw tab at zero and hid a lender's own supplied liquidity.
 */
export function getMarketConfig(id: string): MarketConfig | undefined {
  const key = id.toLowerCase()
  return MARKETS.find(
    (market) => market.id === id || market.pool.toLowerCase() === key,
  )
}
