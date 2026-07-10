import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MARKETS, TOKENS } from '#/lib/contracts'
import {
  createMockIndexerAdapter,
  mockIndexerAdapter,
} from './indexerAdapter.mock'
import { IndexerError, createLiveIndexerAdapter } from './indexerAdapter'

const POOL = MARKETS[0].pool
const USER = '0x1111111111111111111111111111111111111111' as const
const URL = 'https://indexer.example/graphql'

function mockFetch(payload: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(payload),
  })
}

const RAW_POOL = {
  lendingPool: '0xb45693e9f28ceb47fc3c81b45535e3d808196406',
  collateralToken: '0xc3be8ab4ca0cefe3119a765b324bbdf54a16a65b',
  borrowToken: '0x4852bc014401415c4ce4788a04cab019d1527aaa',
  collateralTokenFormatted: 'pxWHSK',
  borrowTokenFormatted: 'pxUSDT',
  ltv: '700000000000000000',
  baseRate: '500000000000000',
  rateAtOptimal: '80000000000000000',
  optimalUtilization: '800000000000000000',
  maxUtilization: '900000000000000000',
  maxRate: '400000000000000000',
  liquidationThreshold: '750000000000000000',
  liquidationBonus: '100000000000000000',
  sharesToken: '0xe9d61d5f19fb2326cba5d092eb610c964371c505',
  router: '0xe2ee3ce542c887b8878fea3e7420f912b7b8c0cf',
  contractChainId: 177,
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

describe('mockIndexerAdapter.getPools', () => {
  it('returns the four live pools including the cross-chain market', async () => {
    const pools = await mockIndexerAdapter.getPools()
    expect(pools).toHaveLength(4)
    const xchain = pools.find(
      (p) =>
        p.collateralToken.toLowerCase() ===
        '0x7c9cf703903680ae5eb6ec2bb2bebb1ec751918a',
    )
    expect(xchain).toBeDefined()
    expect(xchain?.collateralTokenFormatted).toBe('pxWHSK-xc')
    // Every pool is on HashKey 177 and borrows pxUSDT.
    for (const p of pools) {
      expect(p.contractChainId).toBe(177)
      expect(p.borrowTokenFormatted).toBe('pxUSDT')
      expect(p.ltv).toBe(700_000_000_000_000_000n)
    }
  })

  it('rejects when the failure fixture is active', async () => {
    const failing = createMockIndexerAdapter({ failPools: true })
    await expect(failing.getPools()).rejects.toBeInstanceOf(IndexerError)
  })
})

// The live GraphQL adapter maps Ponder rows (under `items`) to domain models.
describe('createLiveIndexerAdapter', () => {
  const original = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    globalThis.fetch = original
  })

  describe('getPools', () => {
    it('warns when the reserve-factor page is truncated, rather than defaulting to 0', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      globalThis.fetch = mockFetch({
        data: {
          lendingPoolCreateds: { items: [RAW_POOL] },
          // 9 rows exist upstream; the bounded page returned one.
          tokenReserveFactorSets: {
            totalCount: 9,
            items: [
              {
                lendingPool: RAW_POOL.router,
                reserveFactor: '150000000000000000',
                timestamp: 1,
              },
            ],
          },
        },
      })
      await createLiveIndexerAdapter(URL).getPools()
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('reserve-factor page truncated'),
      )
      spy.mockRestore()
    })

    it('stays quiet when the reserve-factor page is complete', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      globalThis.fetch = mockFetch({
        data: {
          lendingPoolCreateds: { items: [RAW_POOL] },
          tokenReserveFactorSets: {
            totalCount: 1,
            items: [
              {
                lendingPool: RAW_POOL.router,
                reserveFactor: '150000000000000000',
                timestamp: 1,
              },
            ],
          },
        },
      })
      const pools = await createLiveIndexerAdapter(URL).getPools()
      expect(pools[0].reserveFactorWad).toBe(150_000_000_000_000_000n)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('maps a well-formed lendingPoolCreateds.items response into pool records', async () => {
      globalThis.fetch = mockFetch({
        data: { lendingPoolCreateds: { items: [RAW_POOL] } },
      })
      const pools = await createLiveIndexerAdapter(URL).getPools()
      expect(pools).toHaveLength(1)
      const p = pools[0]
      expect(p.lendingPool).toBe(RAW_POOL.lendingPool)
      expect(p.collateralToken).toBe(RAW_POOL.collateralToken)
      expect(p.borrowToken).toBe(RAW_POOL.borrowToken)
      expect(p.collateralTokenFormatted).toBe('pxWHSK')
      expect(p.borrowTokenFormatted).toBe('pxUSDT')
      // Every risk parameter preserved as a WAD bigint.
      expect(p.ltv).toBe(700_000_000_000_000_000n)
      expect(p.baseRate).toBe(500_000_000_000_000n)
      expect(p.rateAtOptimal).toBe(80_000_000_000_000_000n)
      expect(p.optimalUtilization).toBe(800_000_000_000_000_000n)
      expect(p.maxUtilization).toBe(900_000_000_000_000_000n)
      expect(p.maxRate).toBe(400_000_000_000_000_000n)
      expect(p.liquidationThreshold).toBe(750_000_000_000_000_000n)
      expect(p.liquidationBonus).toBe(100_000_000_000_000_000n)
      expect(p.sharesToken).toBe(RAW_POOL.sharesToken)
      expect(p.router).toBe(RAW_POOL.router)
      expect(p.contractChainId).toBe(177)
    })

    it('resolves to an empty array for a well-formed empty items list', async () => {
      globalThis.fetch = mockFetch({
        data: { lendingPoolCreateds: { items: [] } },
      })
      await expect(createLiveIndexerAdapter(URL).getPools()).resolves.toEqual(
        [],
      )
    })

    it('rejects when fetch rejects', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'))
      await expect(
        createLiveIndexerAdapter(URL).getPools(),
      ).rejects.toBeInstanceOf(IndexerError)
    })

    it('rejects on a non-OK response', async () => {
      globalThis.fetch = mockFetch({}, false)
      await expect(
        createLiveIndexerAdapter(URL).getPools(),
      ).rejects.toBeInstanceOf(IndexerError)
    })

    it('rejects when the body carries a GraphQL errors field', async () => {
      globalThis.fetch = mockFetch({ errors: [{ message: 'boom' }] })
      await expect(
        createLiveIndexerAdapter(URL).getPools(),
      ).rejects.toBeInstanceOf(IndexerError)
    })

    it('rejects when lendingPoolCreateds is absent', async () => {
      globalThis.fetch = mockFetch({ data: {} })
      await expect(
        createLiveIndexerAdapter(URL).getPools(),
      ).rejects.toBeInstanceOf(IndexerError)
    })

    it('rejects when items is not an array', async () => {
      globalThis.fetch = mockFetch({
        data: { lendingPoolCreateds: { items: null } },
      })
      await expect(
        createLiveIndexerAdapter(URL).getPools(),
      ).rejects.toBeInstanceOf(IndexerError)
    })
  })

  it('maps user-history items into a newest-first HistoryEvent list', async () => {
    globalThis.fetch = mockFetch({
      data: {
        supplyLiquiditys: {
          items: [
            {
              id: 's1',
              lendingPoolAddress: POOL,
              amount: '1000000',
              timestamp: 100,
              txHash: '0xaa',
            },
          ],
        },
        borrowDebts: {
          items: [
            {
              id: 'b1',
              lendingPoolAddress: POOL,
              amount: '500000',
              timestamp: 200,
              txHash: '0xbb',
            },
          ],
        },
      },
    })

    const adapter = createLiveIndexerAdapter(URL)
    const history = await adapter.getUserHistory(USER)
    expect(history).toHaveLength(2)
    // Newest first (timestamp 200 before 100).
    expect(history[0].action).toBe('borrow')
    expect(history[1].action).toBe('supply')
    // The borrow-token metadata (pxUSDT, 6dp) is resolved from config.
    expect(history[0].tokenSymbol).toBe('pxUSDT')
    expect(history[0].decimals).toBe(6)
    expect(history[0].token).toBe(TOKENS.pxUSDT.address)
    expect(history[0].amount).toBe(500_000n)
    expect(history[0].marketId).toBe(MARKETS[0].id)
  })

  it('maps a liquidation item onto its borrow token and seized assets', async () => {
    globalThis.fetch = mockFetch({
      data: {
        liquidations: {
          items: [
            {
              id: 'l1',
              lendingPoolAddress: POOL,
              borrowToken: TOKENS.pxUSDT.address,
              userBorrowAssets: '250000',
              timestamp: 300,
              txHash: '0xcc',
            },
          ],
        },
      },
    })
    const history = await createLiveIndexerAdapter(URL).getUserHistory(USER)
    expect(history).toHaveLength(1)
    expect(history[0].action).toBe('liquidation')
    expect(history[0].amount).toBe(250_000n)
    expect(history[0].tokenSymbol).toBe('pxUSDT')
  })

  it('maps WAD rate snapshots to display percents', async () => {
    const wad = 10n ** 18n
    globalThis.fetch = mockFetch({
      data: {
        lendingPoolRateSnapshots: {
          items: [
            {
              timestamp: 100,
              borrowApy: ((7n * wad) / 100n).toString(), // 7%
              supplyApy: ((4n * wad) / 100n).toString(), // 4%
            },
          ],
        },
      },
    })

    const series = await createLiveIndexerAdapter(URL).getRateHistory(POOL)
    expect(series).toHaveLength(1)
    expect(series[0].borrowApr).toBeCloseTo(7, 2)
    expect(series[0].supplyApy).toBeCloseTo(4, 2)
  })

  it('sums activity totalCounts into a transaction count', async () => {
    globalThis.fetch = mockFetch({
      data: {
        supplyLiquiditys: { totalCount: 6 },
        withdrawLiquiditys: { totalCount: 1 },
        borrowDebts: { totalCount: 3 },
        repayByPositions: { totalCount: 2 },
        liquidations: { totalCount: 0 },
      },
    })
    const aggregates =
      await createLiveIndexerAdapter(URL).getProtocolAggregates()
    expect(aggregates.transactionCount).toBe(12)
  })

  it('reports a delivered cross-chain status once the inbound leg lands', async () => {
    globalThis.fetch = mockFetch({
      data: {
        crossChainTransfers: {
          items: [{ id: '0xmsg', inboundTxHash: '0xdd', inboundAt: 123 }],
        },
      },
    })
    const status =
      await createLiveIndexerAdapter(URL).getCrossChainStatus('0xmsg')
    expect(status.status).toBe('delivered')
  })

  it('reports pending when the cross-chain transfer has no inbound leg', async () => {
    globalThis.fetch = mockFetch({
      data: { crossChainTransfers: { items: [] } },
    })
    const status =
      await createLiveIndexerAdapter(URL).getCrossChainStatus('0xmsg')
    expect(status.status).toBe('pending')
  })

  it('degrades the non-critical reads to empty on a network error (never throws)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline'))
    const adapter = createLiveIndexerAdapter(URL)
    await expect(adapter.getUserHistory(USER)).resolves.toEqual([])
    await expect(adapter.getRateHistory(POOL)).resolves.toEqual([])
  })

  it('degrades to zeroed aggregates on a GraphQL error response', async () => {
    globalThis.fetch = mockFetch({ errors: [{ message: 'boom' }] })
    const aggregates =
      await createLiveIndexerAdapter(URL).getProtocolAggregates()
    expect(aggregates.cumulativeVolumeUsd).toBe(0)
    expect(aggregates.transactionCount).toBe(0)
  })
})
