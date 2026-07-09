import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MARKETS, TOKENS } from '#/lib/contracts'
import { mockIndexerAdapter } from './indexerAdapter.mock'
import { createLiveIndexerAdapter } from './indexerAdapter'

const POOL = MARKETS[0].pool
const USER = '0x1111111111111111111111111111111111111111' as const
const URL = 'https://indexer.example/graphql'

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(payload),
  })
}

describe('mockIndexerAdapter.getRateHistory', () => {
  it('returns a rate series for a market', async () => {
    const series = await mockIndexerAdapter.getRateHistory(POOL)
    expect(series.length).toBeGreaterThan(0)
    expect(series[0]).toHaveProperty('timestamp')
    expect(series[0]).toHaveProperty('borrowApr')
    expect(series[0]).toHaveProperty('supplyApy')
  })
})

// Covers R7: the live GraphQL adapter maps subgraph entities to domain models.
describe('createLiveIndexerAdapter', () => {
  const original = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    globalThis.fetch = original
  })

  it('maps user-history entities into a newest-first HistoryEvent list', async () => {
    globalThis.fetch = mockFetch({
      data: {
        supplies: [
          {
            id: 's1',
            pool: POOL,
            token: TOKENS.pxUSDT.address,
            amount: '1000000',
            timestamp: '100',
            txHash: '0xaa',
          },
        ],
        borrows: [
          {
            id: 'b1',
            pool: POOL,
            token: TOKENS.pxUSDT.address,
            amount: '500000',
            timestamp: '200',
            txHash: '0xbb',
          },
        ],
      },
    })

    const adapter = createLiveIndexerAdapter(URL)
    const history = await adapter.getUserHistory(USER)
    expect(history).toHaveLength(2)
    // Newest first (timestamp 200 before 100).
    expect(history[0].action).toBe('borrow')
    expect(history[1].action).toBe('supply')
    // Token metadata resolved from config.
    expect(history[0].tokenSymbol).toBe('pxUSDT')
    expect(history[0].decimals).toBe(6)
    expect(history[0].amount).toBe(500_000n)
  })

  it('maps WAD rate strings to display percents', async () => {
    const wad = 10n ** 18n
    globalThis.fetch = mockFetch({
      data: {
        lendingPoolRates: [
          {
            timestamp: '100',
            borrowRate: ((7n * wad) / 100n).toString(), // 7%
            supplyRate: ((4n * wad) / 100n).toString(), // 4%
          },
        ],
      },
    })

    const series = await createLiveIndexerAdapter(URL).getRateHistory(POOL)
    expect(series).toHaveLength(1)
    expect(series[0].borrowApr).toBeCloseTo(7, 2)
    expect(series[0].supplyApy).toBeCloseTo(4, 2)
  })

  it('degrades to empty on a network error (never throws)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('offline'))
    const adapter = createLiveIndexerAdapter(URL)
    await expect(adapter.getUserHistory(USER)).resolves.toEqual([])
    await expect(adapter.getRateHistory(POOL)).resolves.toEqual([])
  })

  it('degrades to zeroed aggregates on a GraphQL error response', async () => {
    globalThis.fetch = mockFetch({
      errors: [{ message: 'boom' }],
    })
    const aggregates =
      await createLiveIndexerAdapter(URL).getProtocolAggregates()
    expect(aggregates.cumulativeVolumeUsd).toBe(0)
    expect(aggregates.transactionCount).toBe(0)
  })
})
