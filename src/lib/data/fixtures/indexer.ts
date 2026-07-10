/**
 * Indexer-adapter fixtures. History, protocol aggregates, and the pool list
 * behind the mock `IndexerAdapter`, shaped after the live Ponder tables so the
 * mock↔live swap is a registry flip. TVL/utilization are intentionally absent —
 * those come from the chain adapter, never the indexer.
 */
import { MARKETS, TOKENS } from '#/lib/contracts'
import type {
  HistoryEvent,
  ProtocolAggregates,
  RatePoint,
  RawPool,
} from '../types'

const PXWHSK = MARKETS[0]

/** WAD risk params shared by all four live markets (from `lendingPoolCreateds`). */
const SHARED_POOL_PARAMS = {
  ltv: 700_000_000_000_000_000n,
  baseRate: 500_000_000_000_000n,
  rateAtOptimal: 80_000_000_000_000_000n,
  optimalUtilization: 800_000_000_000_000_000n,
  maxUtilization: 900_000_000_000_000_000n,
  maxRate: 400_000_000_000_000_000n,
  liquidationThreshold: 750_000_000_000_000_000n,
  liquidationBonus: 100_000_000_000_000_000n,
  contractChainId: 177,
} as const

const BORROW_TOKEN = TOKENS.pxUSDT.address

/**
 * The four live lending markets exactly as the indexer emits them. The third is
 * the cross-chain market — collateral `pxWHSK-xc` at the CCIP bridge token.
 */
export const POOL_FIXTURES: RawPool[] = [
  {
    lendingPool: '0xb45693e9f28ceb47fc3c81b45535e3d808196406',
    collateralToken: '0xc3be8ab4CA0cefE3119A765b324bBDF54a16A65b',
    collateralTokenFormatted: 'pxWHSK',
    borrowToken: BORROW_TOKEN,
    borrowTokenFormatted: 'pxUSDT',
    sharesToken: '0xe9d61d5f19fb2326cba5d092eb610c964371c505',
    router: '0xe2ee3ce542c887b8878fea3e7420f912b7b8c0cf',
    ...SHARED_POOL_PARAMS,
  },
  {
    lendingPool: '0xc6fa92dfdabd64e0605e479b5cab3696b5d17270',
    collateralToken: '0x718b1b67f287571767452CC7d24BCD95c63DbA13',
    collateralTokenFormatted: 'pxWBTC',
    borrowToken: BORROW_TOKEN,
    borrowTokenFormatted: 'pxUSDT',
    sharesToken: '0xc03f145deee64c51d05617a6954f71c7ec54db9c',
    router: '0x641a6150a0f39ec84af0c56953f759d81c431285',
    ...SHARED_POOL_PARAMS,
  },
  {
    lendingPool: '0xe1ac05a5f188fd90867fe7e5878fa02df9b00dfd',
    collateralToken: '0x7c9cF703903680ae5EB6ec2Bb2BEbb1ec751918A',
    collateralTokenFormatted: 'pxWHSK-xc',
    borrowToken: BORROW_TOKEN,
    borrowTokenFormatted: 'pxUSDT',
    sharesToken: '0x6d66b34f8cb6aeefd605844b2a24b6a8a1cd4dc0',
    router: '0x029cfd8b55a6fbc1fb56a53b271815ec68d2ef11',
    ...SHARED_POOL_PARAMS,
  },
  {
    lendingPool: '0xf1a061db3c2f3985faa1ca178c3cf677b934942d',
    collateralToken: '0x46638aD472507482B7D5ba45124E93D16bc97eCE',
    collateralTokenFormatted: 'pxWETH',
    borrowToken: BORROW_TOKEN,
    borrowTokenFormatted: 'pxUSDT',
    sharesToken: '0x6bdb310ed88dc50c5c7e08f8faeba915dbca158b',
    router: '0x6670100a3c8425468d88c83e110621000f48dcc4',
    ...SHARED_POOL_PARAMS,
  },
]

/** A 7-point rate history per market (preview) — the real series comes from the
 *  indexer. Wobbles around each market's rate-at-optimal. */
export function rateHistoryFixture(borrowApr: number): RatePoint[] {
  const base = 1_720_000_000
  const day = 86_400
  return Array.from({ length: 7 }, (_, i) => {
    const drift = ((i % 3) - 1) * 0.4
    const borrow = Math.max(0, borrowApr + drift)
    return {
      timestamp: base + i * day,
      borrowApr: Number(borrow.toFixed(2)),
      supplyApy: Number((borrow * 0.55).toFixed(2)),
    }
  })
}

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
