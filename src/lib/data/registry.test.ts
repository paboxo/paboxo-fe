import { describe, expect, it, vi } from 'vitest'
import { MARKETS } from '#/lib/contracts'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import { getAdapters, resolveAdapters } from './registry'
import { mockChainAdapter } from './chain/chainAdapter.mock'
import { liveChainAdapter } from './chain/chainAdapter'
import { mockIndexerAdapter } from './indexer/indexerAdapter.mock'
import { MOCK_USER } from './fixtures/chain'

// Covers R4, R5: the registry is the sole mock↔live swap point, and both mock
// adapters honor their interface without the UI ever importing them directly.
describe('data registry', () => {
  it('returns the mock impls under mock mode', () => {
    const adapters = resolveAdapters('mock')
    expect(adapters.chain).toBe(mockChainAdapter)
    expect(adapters.indexer).toBe(mockIndexerAdapter)
  })

  it('swaps the chain adapter to live', () => {
    expect(resolveAdapters('live').chain).not.toBe(
      resolveAdapters('mock').chain,
    )
  })

  // `liveAdapters` binds INDEXER_URL at module load, so these drive the env and
  // re-import rather than assuming what the ambient env happens to hold. The old
  // version asserted "no VITE_INDEXER_URL in the test env" — true on CI, false
  // for any developer with a local .env, who then saw a red suite for no reason.
  it('falls back to the mock indexer when no endpoint is configured (AE4)', async () => {
    vi.stubEnv('VITE_INDEXER_URL', '')
    vi.resetModules()
    const [{ resolveAdapters: resolve }, { mockIndexerAdapter: mockIdx }] =
      await Promise.all([
        import('./registry'),
        import('./indexer/indexerAdapter.mock'),
      ])

    expect(resolve('live').indexer).toBe(mockIdx)
    vi.unstubAllEnvs()
  })

  it('uses the real GraphQL indexer once an endpoint is configured', async () => {
    vi.stubEnv('VITE_INDEXER_URL', 'https://indexer.test/graphql')
    vi.resetModules()
    const [{ resolveAdapters: resolve }, { mockIndexerAdapter: mockIdx }] =
      await Promise.all([
        import('./registry'),
        import('./indexer/indexerAdapter.mock'),
      ])

    expect(resolve('live').indexer).not.toBe(mockIdx)
    vi.unstubAllEnvs()
  })

  it('resolves the real viem chain adapter in live mode (U18)', () => {
    expect(resolveAdapters('live').chain).toBe(liveChainAdapter)
  })

  it('the fallback indexer serves history without an endpoint (AE4)', async () => {
    const history =
      await resolveAdapters('live').indexer.getUserHistory(MOCK_USER)
    expect(Array.isArray(history)).toBe(true)
  })

  it('defaults to mock in the test environment (VITE_DATA_MODE unset)', () => {
    expect(getAdapters().chain).toBe(mockChainAdapter)
  })
})

describe('mock chain adapter', () => {
  it('reads coherent totals for a live market', async () => {
    const totals = await mockChainAdapter.getMarketTotals(MARKETS[0].pool)
    expect(totals.totalSupplyAssets).toBeGreaterThan(0n)
    expect(totals.totalBorrowAssets).toBeLessThan(totals.totalSupplyAssets)
  })

  it('returns zeroed totals for an unknown pool rather than throwing', async () => {
    const totals = await mockChainAdapter.getMarketTotals(
      '0x0000000000000000000000000000000000000000',
    )
    expect(totals.totalSupplyAssets).toBe(0n)
  })

  it('serves a fresh price for a configured token', async () => {
    const { price, updatedAt } = await mockChainAdapter.getPrice(
      MARKETS[0].collateralAddress,
    )
    expect(price).toBeGreaterThan(0n)
    expect(updatedAt).toBeGreaterThan(0)
  })

  it('throws for a token with no price feed fixture', async () => {
    await expect(
      mockChainAdapter.getPrice('0x0000000000000000000000000000000000000000'),
    ).rejects.toThrow(/no price fixture/)
  })

  it('resolves a tx hash for a write', async () => {
    const hash = await mockChainAdapter.supplyLiquidity(
      MARKETS[0].pool,
      MOCK_USER,
      1_000_000n,
    )
    expect(hash).toMatch(/^0x[0-9a-f]+$/)
  })
})

describe('mock indexer adapter', () => {
  it('serves user history newest-shaped and non-empty', async () => {
    const history = await mockIndexerAdapter.getUserHistory(MOCK_USER)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0]).toHaveProperty('action')
    expect(history[0]).toHaveProperty('txHash')
  })

  it('exposes protocol aggregates without TVL/utilization (those are chain-side)', async () => {
    const aggregates = await mockIndexerAdapter.getProtocolAggregates()
    expect(aggregates.cumulativeVolumeUsd).toBeGreaterThan(0)
    expect(aggregates).not.toHaveProperty('totalValueLockedUsd')
    expect(aggregates).not.toHaveProperty('utilization')
  })

  it('mockChainAdapter.enrichPools([]) still verifies every registry token', async () => {
    // The zero-pool call is load-bearing, not a no-op: `useTokenDecimals` reads
    // its token map. The live adapter has this pinned in enrichPools.test.ts;
    // without the same guard here, a mock that short-circuits on an empty list
    // would make every test that leans on it quietly meaningless.
    const result = await mockChainAdapter.enrichPools([])

    expect(Object.keys(result.pools)).toHaveLength(0)
    expect(Object.keys(result.tokens)).toEqual(Object.keys(TOKEN_REGISTRY))
    for (const token of Object.keys(TOKEN_REGISTRY)) {
      expect(result.tokens[token].decimals.valid).toBe(true)
    }
  })
})
