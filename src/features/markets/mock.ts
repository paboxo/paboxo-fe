/**
 * Static pool view fixtures for component tests/preview. The live app reads pools
 * through `hooks/usePools.ts` (adapter-backed); this stays as a synchronous
 * sample so pure rendering tests don't need a query client.
 *
 * Built through the same `assembleMarketView` the live path uses, from the
 * indexer + chain fixtures — so a test asserting against `MOCK_MARKETS` asserts
 * against the exact shape the app produces. Ordered by `MARKETS` (index 3 is the
 * cross-chain pool) so index-addressed fixtures in other suites stay stable.
 */
import { MARKETS, TOKENS } from '#/lib/contracts'
import type { PoolSize, RawPool, TokenPrice } from '#/lib/data'
import { POOL_FIXTURES as CHAIN_FIXTURES, PRICE_FIXTURES } from '#/lib/data/fixtures/chain'
import { POOL_FIXTURES as RAW_POOLS } from '#/lib/data/fixtures/indexer'
import { getTokenByAddress } from '#/lib/tokens/registry'
import { assembleMarketView } from './assemble'
import type { MarketView } from './types'

const NOW = Math.floor(Date.now() / 1000)
const BORROW_DECIMALS = TOKENS.pxUSDT.decimals

function rawFor(pool: string): RawPool {
  const key = pool.toLowerCase()
  const raw = RAW_POOLS.find((p) => p.lendingPool.toLowerCase() === key)
  if (!raw) throw new Error(`mock.ts: no indexer fixture for pool ${pool}`)
  return raw
}

function sizeFor(pool: string): PoolSize {
  const fixture = CHAIN_FIXTURES[pool.toLowerCase()]
  if (!fixture) return { known: false }
  return {
    known: true,
    totalSupplyAssets: fixture.totals.totalSupplyAssets,
    totalBorrowAssets: fixture.totals.totalBorrowAssets,
    borrowRateWad: fixture.borrowRateWad,
  }
}

function priceFor(token: string): TokenPrice {
  const raw = PRICE_FIXTURES[token.toLowerCase()]
  return raw === undefined
    ? { available: false }
    : { available: true, data: { price: raw, updatedAt: NOW } }
}

export const MOCK_MARKETS: MarketView[] = MARKETS.map((config) => {
  const raw = rawFor(config.pool)
  const collateralDecimals =
    getTokenByAddress(config.collateralAddress)?.decimals ??
    config.collateralDecimals
  return assembleMarketView(
    raw,
    sizeFor(config.pool),
    priceFor(config.collateralAddress),
    collateralDecimals,
    BORROW_DECIMALS,
  )
})
