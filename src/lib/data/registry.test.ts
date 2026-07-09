import { describe, expect, it } from 'vitest'
import { MARKETS } from '#/lib/contracts'
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

  it('returns a different impl when the mode flag flips to live', () => {
    const mock = resolveAdapters('mock')
    const live = resolveAdapters('live')
    expect(live.chain).not.toBe(mock.chain)
    expect(live.indexer).not.toBe(mock.indexer)
  })

  it('resolves the real viem chain adapter in live mode (U18)', () => {
    expect(resolveAdapters('live').chain).toBe(liveChainAdapter)
  })

  it('indexer is still a notImplemented stub in live mode (U19 pending)', async () => {
    const live = resolveAdapters('live')
    await expect(live.indexer.getUserHistory(MOCK_USER)).rejects.toThrow(
      /not wired yet/,
    )
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
})
