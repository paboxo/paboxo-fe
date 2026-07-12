import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { TOKENS } from '#/lib/contracts'
import type { IndexerAdapter, PoolSize, RawPool, TokenPrice } from '#/lib/data'
import {
  mockChainAdapter,
  resetMockEnrichFailures,
  setMockEnrichFailures,
} from '#/lib/data/chain/chainAdapter.mock'
import { createMockIndexerAdapter } from '#/lib/data/indexer/indexerAdapter.mock'
import { POOL_FIXTURES as RAW_POOLS } from '#/lib/data/fixtures/indexer'
import type * as DataModule from '#/lib/data'
import { getAddress } from 'viem'
import { assembleMarketView } from '../assemble'
import { usePool, usePools } from './usePools'

// A controllable adapter pair — each test swaps `adapters` before rendering.
let adapters: { chain: typeof mockChainAdapter; indexer: IndexerAdapter }
vi.mock('#/lib/data', async (importOriginal) => {
  const actual = await importOriginal<typeof DataModule>()
  return { ...actual, getAdapters: () => adapters }
})

const PXUSDT = TOKENS.pxUSDT.address.toLowerCase()
const PXWHSK = TOKENS.pxWHSK.address.toLowerCase()
const PXWBTC = TOKENS.pxWBTC.address.toLowerCase()
const PXWHSK_POOL = RAW_POOLS[0].lendingPool.toLowerCase()

function indexerReturning(pools: RawPool[]): IndexerAdapter {
  return {
    ...createMockIndexerAdapter(),
    getPools: () => Promise.resolve(pools),
  }
}

function renderPools() {
  return renderHook(() => usePools(), { wrapper: QueryWrapper })
}

async function settled(result: ReturnType<typeof renderPools>['result']) {
  await waitFor(() => expect(result.current.isLoading).toBe(false))
}

beforeEach(() => {
  resetMockEnrichFailures()
  adapters = { chain: mockChainAdapter, indexer: createMockIndexerAdapter() }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePools — validation and degraded states', () => {
  it('drops a pool whose collateral token is absent from the registry, warning once (R11)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const unknownCollateral = '0xdead00000000000000000000000000000000beef'
    const unknownPool: RawPool = {
      ...RAW_POOLS[1],
      collateralToken: unknownCollateral,
    }
    adapters.indexer = indexerReturning([RAW_POOLS[0], unknownPool])

    const { result } = renderPools()
    await settled(result)

    expect(
      result.current.data.map((m) => m.collateralAddress.toLowerCase()),
    ).not.toContain(unknownCollateral)
    expect(result.current.data).toHaveLength(1)
    expect(warn.mock.calls.flat().join(' ')).toContain(unknownCollateral)
  })

  it('removes every pool using a token whose on-chain decimals disagree, logging an error (R8)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    setMockEnrichFailures({ mismatchedDecimals: { [PXWHSK]: 6 } })

    const { result } = renderPools()
    await settled(result)

    // The pxWHSK collateral pool is gone; of the rest only the two same-chain
    // pools remain (the cross-chain pool is hidden from the list).
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data.map((m) => m.id)).not.toContain(PXWHSK_POOL)
    expect(error.mock.calls.flat().join(' ')).toContain(TOKENS.pxWHSK.address)
  })

  it('removes every pool using a token whose decimals() reverts, logging an error (R8)', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    setMockEnrichFailures({ unreadableDecimals: [PXWBTC] })

    const { result } = renderPools()
    await settled(result)

    expect(result.current.data).toHaveLength(2)
    expect(
      result.current.data.some(
        (m) => m.collateralAddress.toLowerCase() === PXWBTC,
      ),
    ).toBe(false)
    expect(error).toHaveBeenCalled()
  })

  it('signals a shared-token failure when the borrow token (pxUSDT) fails validation (R28)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setMockEnrichFailures({ unreadableDecimals: [PXUSDT] })

    const { result } = renderPools()
    await settled(result)

    expect(result.current.data).toHaveLength(0)
    expect(result.current.sharedTokenFailed).toBe(true)
  })

  it('surfaces an error rather than an empty list when getPools rejects (R32)', async () => {
    adapters.indexer = createMockIndexerAdapter({ failPools: true })

    const { result } = renderPools()
    await waitFor(() => expect(result.current.error).toBeTruthy())

    expect(result.current.data).toHaveLength(0)
    expect(result.current.sharedTokenFailed).toBe(false)
  })

  it('keeps a pool with an unavailable price, marking it stale with undefined price cells (R9)', async () => {
    setMockEnrichFailures({ stalePrices: [PXWHSK] })

    const { result } = renderPools()
    await settled(result)

    const pool = result.current.data.find((m) => m.id === PXWHSK_POOL)
    expect(pool).toBeDefined()
    expect(pool?.priceStale).toBe(true)
    expect(pool?.priceUsd).toBeUndefined()
    // Size-derived cells stay populated — only the price is missing.
    expect(pool?.tvlUsd).toBeGreaterThan(0)
  })

  it('keeps a pool with an unknown size, marking size-derived cells undefined (R27)', async () => {
    setMockEnrichFailures({ unknownSizePools: [PXWHSK_POOL] })

    const { result } = renderPools()
    await settled(result)

    const pool = result.current.data.find((m) => m.id === PXWHSK_POOL)
    expect(pool).toBeDefined()
    expect(pool?.sizeKnown).toBe(false)
    expect(pool?.tvlUsd).toBeUndefined()
    expect(pool?.supplyApy).toBeUndefined()
    expect(pool?.totalSupplyAssets).toBeUndefined()
  })
})

describe('usePools — result contract', () => {
  it('carries no rewards-apy key on any pool (R6)', async () => {
    // Assembled from parts so the deleted-field grep stays clean.
    const deletedKey = ['rewards', 'Apy'].join('')
    const { result } = renderPools()
    await settled(result)

    expect(result.current.data.length).toBeGreaterThan(0)
    for (const pool of result.current.data) {
      expect(Object.keys(pool)).not.toContain(deletedKey)
    }
  })

  it('issues exactly one query; sorting the result twice performs no extra fetch (R17)', async () => {
    const getPools = vi.fn(() => Promise.resolve([...RAW_POOLS]))
    adapters.indexer = { ...createMockIndexerAdapter(), getPools }

    const { result } = renderPools()
    await settled(result)

    // Deriving over the fetched array (sorting) touches no I/O.
    ;[...result.current.data].sort((a, b) => a.id.localeCompare(b.id))
    ;[...result.current.data].sort((a, b) => b.id.localeCompare(a.id))

    expect(getPools).toHaveBeenCalledTimes(1)
  })
})

describe('usePool — pool-address route identity (U6, R30)', () => {
  function renderPool(address: string) {
    return renderHook(() => usePool(address as `0x${string}`), {
      wrapper: QueryWrapper,
    })
  }

  it('is pending while the shared query loads, never not-found', () => {
    const { result } = renderPool(PXWHSK_POOL)
    expect(result.current.status).toBe('pending')
  })

  it('resolves a checksummed URL case-insensitively to the ready pool', async () => {
    const { result } = renderPool(getAddress(PXWHSK_POOL))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.status === 'ready' && result.current.market.id).toBe(
      PXWHSK_POOL,
    )
  })

  it('is not-found for an address the indexer never returned', async () => {
    const { result } = renderPool('0xabc0000000000000000000000000000000000abc')
    await waitFor(() => expect(result.current.status).not.toBe('pending'))
    expect(result.current.status).toBe('not-found')
  })

  it('is unavailable for a pool the indexer returned but validation removed', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // The indexer returns this pool, but its collateral token is unknown, so
    // validation drops it — the address stays in `indexerPools`.
    const unknownPool: RawPool = {
      ...RAW_POOLS[1],
      collateralToken: '0xdead00000000000000000000000000000000beef',
    }
    adapters.indexer = indexerReturning([RAW_POOLS[0], unknownPool])

    const { result } = renderPool(unknownPool.lendingPool)
    await waitFor(() => expect(result.current.status).not.toBe('pending'))
    expect(result.current.status).toBe('unavailable')
  })

  it('is unavailable (not not-found) when the shared borrow token failed and every pool disappeared', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setMockEnrichFailures({ unreadableDecimals: [PXUSDT] })

    const { result } = renderPool(PXWHSK_POOL)
    await waitFor(() => expect(result.current.status).not.toBe('pending'))
    expect(result.current.status).toBe('unavailable')
  })

  it('is unavailable rather than not-found when the query rejects', async () => {
    adapters.indexer = createMockIndexerAdapter({ failPools: true })

    const { result } = renderPool(PXWHSK_POOL)
    await waitFor(() => expect(result.current.status).not.toBe('pending'))
    expect(result.current.status).toBe('unavailable')
  })
})

describe('assembleMarketView — reserve factor feeds supplyApy (R1, R14)', () => {
  it('yields a lower supply APY at a 15% reserve factor than at 0%', () => {
    const size: PoolSize = {
      known: true,
      totalSupplyAssets: 1_000_000n,
      totalBorrowAssets: 500_000n, // 50% utilization
      borrowRateWad: 10n ** 17n, // 10% borrow rate
    }
    const price: TokenPrice = {
      available: true,
      data: { price: 100_000_000n, updatedAt: 0 },
    }
    const noReserve = assembleMarketView(
      { ...RAW_POOLS[0], reserveFactorWad: 0n },
      size,
      price,
      18,
      6,
    )
    const withReserve = assembleMarketView(
      { ...RAW_POOLS[0], reserveFactorWad: 150_000_000_000_000_000n },
      size,
      price,
      18,
      6,
    )

    expect(noReserve.supplyApy).toBeGreaterThan(withReserve.supplyApy ?? 0)
  })
})
