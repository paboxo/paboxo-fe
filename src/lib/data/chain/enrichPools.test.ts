import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readContract, readContracts } from '@wagmi/core'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import type { Address } from '#/lib/contracts'
import { liveChainAdapter } from './chainAdapter'
import type { RawPool } from '../types'

// No live RPC — mock @wagmi/core so we can drive each call's success/failure.
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  readContracts: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}))
vi.mock('#/lib/web3/config', () => ({ wagmiConfig: { mock: true } }))

const mockReads = vi.mocked(readContracts)
const mockRead = vi.mocked(readContract)

const REGISTRY_TOKENS = Object.keys(TOKEN_REGISTRY) as Array<`0x${string}`>
const PXUSDT = REGISTRY_TOKENS.find(
  (a) => TOKEN_REGISTRY[a].label === 'pxUSDT',
) as Address
const PXWETH = REGISTRY_TOKENS.find(
  (a) => TOKEN_REGISTRY[a].label === 'pxWETH',
) as Address
const PXWHSK_XC = REGISTRY_TOKENS.find(
  (a) => TOKEN_REGISTRY[a].label === 'pxWHSK-xc',
) as Address

/** The router cache is module-level, so every test needs fresh pool addresses. */
let seq = 0
function nextPool(): Address {
  seq += 1
  return `0x${seq.toString(16).padStart(40, '0')}`
}
function routerFor(pool: Address): Address {
  return `0xrr${pool.slice(4)}`.replace('rr', 'ee') as Address
}

function rawPool(pool: Address, collateral: Address): RawPool {
  return {
    lendingPool: pool,
    collateralToken: collateral,
    collateralTokenFormatted: TOKEN_REGISTRY[collateral.toLowerCase()].label,
    borrowToken: PXUSDT,
    borrowTokenFormatted: 'pxUSDT',
    ltv: 700000000000000000n,
    baseRate: 0n,
    rateAtOptimal: 0n,
    optimalUtilization: 0n,
    maxUtilization: 0n,
    maxRate: 0n,
    liquidationThreshold: 0n,
    liquidationBonus: 0n,
    sharesToken: PXUSDT,
    router: routerFor(pool),
    reserveFactorWad: 0n,
    contractChainId: 177,
  }
}

type Result =
  { status: 'success'; result: unknown } | { status: 'failure'; error: Error }

const ok = (result: unknown): Result => ({ status: 'success', result })
const fail = (message = 'reverted'): Result => ({
  status: 'failure',
  error: new Error(message),
})

/** 8-dp price feed tuple: [roundId, answer, startedAt, updatedAt, answeredInRound]. */
const roundData = (price: bigint, updatedAt: number) => [
  1n,
  price,
  0n,
  BigInt(updatedAt),
  0n,
]

const NOW = 1_783_600_000

interface Scenario {
  /** Per-pool: router read result, keyed by pool address. */
  routers?: Record<string, Result>
  /** Per-pool: [totalSupplyAssets, totalBorrowAssets, borrowRateWad]. */
  balances?: Record<string, [Result, Result, Result]>
  /** Per-token decimals result. */
  decimals?: Record<string, Result>
  /** Per-token latestRoundData result. */
  prices?: Record<string, Result>
}

/** One entry of the `contracts` array the adapter actually sends. */
interface SentCall {
  address: string
  functionName: string
  args?: unknown[]
}

/**
 * Answer each call by **what was asked**, never by position.
 *
 * The previous version rebuilt the expected phase-2 layout from its own copy of
 * the rules and returned that array. It therefore agreed with the code by
 * construction: reorder the contracts array and the test still passed, because
 * it never read the contracts array. Keying the response off `(address,
 * functionName, args)` means the adapter's own request has to line up with the
 * result it reads back, which is the whole thing the offset arithmetic asserts.
 */
function driveBatches(pools: RawPool[], s: Scenario) {
  mockReads.mockReset()
  mockReads.mockImplementation((_config, args) => {
    const contracts = (args as unknown as { contracts: SentCall[] }).contracts

    const answer = (c: SentCall): Result => {
      const at = c.address.toLowerCase()

      // `router()` is asked of the pool itself.
      if (c.functionName === 'router') {
        return s.routers?.[at] ?? ok(routerFor(at as Address))
      }

      // Balances are asked of a router; map back to the pool that owns it.
      if (
        c.functionName === 'totalSupplyAssets' ||
        c.functionName === 'totalBorrowAssets'
      ) {
        const pool = pools.find(
          (p) => routerFor(p.lendingPool).toLowerCase() === at,
        )
        const key = pool?.lendingPool.toLowerCase() ?? ''
        const trio = s.balances?.[key] ?? DEFAULT_TRIO
        return c.functionName === 'totalSupplyAssets' ? trio[0] : trio[1]
      }

      // The rate is asked of the IRM, with the router as its argument.
      if (c.functionName === 'calculateBorrowRate') {
        const router = String(c.args?.[0] ?? '').toLowerCase()
        const pool = pools.find(
          (p) => routerFor(p.lendingPool).toLowerCase() === router,
        )
        const key = pool?.lendingPool.toLowerCase() ?? ''
        return (s.balances?.[key] ?? DEFAULT_TRIO)[2]
      }

      // `decimals()` is asked of the token itself.
      if (c.functionName === 'decimals') {
        return s.decimals?.[at] ?? ok(TOKEN_REGISTRY[at].decimals)
      }

      // The price is asked of the feed contract, with the token as its argument.
      if (c.functionName === 'latestRoundData') {
        const token = String(c.args?.[0] ?? '').toLowerCase()
        return s.prices?.[token] ?? ok(roundData(100_000_000n, NOW))
      }

      throw new Error(`unexpected call: ${c.functionName} @ ${c.address}`)
    }

    return Promise.resolve(contracts.map(answer) as unknown as never)
  })
}

const DEFAULT_TRIO: [Result, Result, Result] = [
  ok(1000n),
  ok(400n),
  ok(5n * 10n ** 16n),
]

beforeEach(() => {
  mockRead.mockReset()
  mockReads.mockReset()
})

describe('enrichPools — happy path', () => {
  it('returns known balances, available prices, and valid decimals for every pool', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, {})

    const result = await liveChainAdapter.enrichPools(pools)

    const size = result.pools[pool.toLowerCase()].size
    expect(size.known).toBe(true)
    if (size.known) {
      expect(size.totalSupplyAssets).toBe(1000n)
      expect(size.totalBorrowAssets).toBe(400n)
      expect(size.borrowRateWad).toBe(5n * 10n ** 16n)
    }
    for (const token of REGISTRY_TOKENS) {
      expect(result.tokens[token].decimals.valid).toBe(true)
      expect(result.tokens[token].price.available).toBe(true)
    }
  })

  it('issues two readContracts calls on a cold cache and one when warm', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, {})

    await liveChainAdapter.enrichPools(pools)
    expect(mockReads).toHaveBeenCalledTimes(2)

    // Same pool again: the router is cached, so phase 1 has nothing to ask.
    await liveChainAdapter.enrichPools(pools)
    expect(mockReads).toHaveBeenCalledTimes(3)
  })
})

describe('enrichPools — price failures', () => {
  it('marks only the reverting token price unavailable and resolves everything else', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWHSK_XC)]
    driveBatches(pools, { prices: { [PXWHSK_XC]: fail('PriceStale') } })

    const result = await liveChainAdapter.enrichPools(pools)

    expect(result.tokens[PXWHSK_XC].price.available).toBe(false)
    expect(result.tokens[PXUSDT].price.available).toBe(true)
    expect(result.tokens[PXWHSK_XC].decimals.valid).toBe(true)
    expect(result.pools[pool.toLowerCase()].size.known).toBe(true)
  })

  it('exposes the feed timestamp so a caller can render freshness', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, {
      prices: { [PXWETH]: ok(roundData(174_678_000_000n, NOW)) },
    })

    const result = await liveChainAdapter.enrichPools(pools)
    const price = result.tokens[PXWETH].price
    expect(price.available).toBe(true)
    if (price.available) {
      expect(price.data.price).toBe(174_678_000_000n)
      expect(price.data.updatedAt).toBe(NOW)
    }
  })
})

describe('enrichPools — decimals failures (fail closed)', () => {
  it('marks a token invalid when on-chain decimals disagree with the registry', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, { decimals: { [PXWETH]: ok(6) } })

    const result = await liveChainAdapter.enrichPools(pools)
    const d = result.tokens[PXWETH].decimals

    expect(d.valid).toBe(false)
    if (!d.valid) {
      expect(d.reason).toBe('mismatch')
      expect(d.registry).toBe(18)
      if (d.reason === 'mismatch') expect(d.onChain).toBe(6)
    }
  })

  it('marks a token invalid — not merely unavailable — when decimals() reverts', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, { decimals: { [PXWETH]: fail('no such method') } })

    const result = await liveChainAdapter.enrichPools(pools)
    const d = result.tokens[PXWETH].decimals

    expect(d.valid).toBe(false)
    if (!d.valid) expect(d.reason).toBe('unreadable')
  })

  it('never falls back to the registry value when decimals() reverts', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, { decimals: { [PXWETH]: fail() } })

    const result = await liveChainAdapter.enrichPools(pools)
    const d = result.tokens[PXWETH].decimals

    // The union has no `decimals` member on the invalid arm — a caller cannot
    // reach an unverified number by accident.
    expect('decimals' in d).toBe(false)
  })

  it('a reverting price does not invalidate that token’s decimals', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    driveBatches(pools, { prices: { [PXWETH]: fail('PriceStale') } })

    const result = await liveChainAdapter.enrichPools(pools)
    expect(result.tokens[PXWETH].decimals.valid).toBe(true)
    expect(result.tokens[PXWETH].price.available).toBe(false)
  })
})

describe('enrichPools — balance and router failures (degrade, do not drop)', () => {
  it('marks one pool’s size unknown when totalSupplyAssets reverts, others resolve', async () => {
    const bad = nextPool()
    const good = nextPool()
    const pools = [rawPool(bad, PXWETH), rawPool(good, PXWHSK_XC)]
    driveBatches(pools, {
      balances: { [bad.toLowerCase()]: [fail(), ok(0n), ok(0n)] },
    })

    const result = await liveChainAdapter.enrichPools(pools)
    expect(result.pools[bad.toLowerCase()].size.known).toBe(false)
    expect(result.pools[good.toLowerCase()].size.known).toBe(true)
  })

  it('marks a pool’s size unknown when router() reverts, without rejecting the batch', async () => {
    const bad = nextPool()
    const good = nextPool()
    const pools = [rawPool(bad, PXWETH), rawPool(good, PXWHSK_XC)]
    driveBatches(pools, { routers: { [bad.toLowerCase()]: fail() } })

    const result = await liveChainAdapter.enrichPools(pools)
    expect(result.pools[bad.toLowerCase()].size.known).toBe(false)
    expect(result.pools[good.toLowerCase()].size.known).toBe(true)
  })

  it('a mixed batch produces no thrown error and no zero-valued sentinel', async () => {
    const a = nextPool()
    const b = nextPool()
    const pools = [rawPool(a, PXWETH), rawPool(b, PXWHSK_XC)]
    driveBatches(pools, {
      routers: { [b.toLowerCase()]: fail() },
      balances: { [a.toLowerCase()]: [ok(0n), ok(0n), ok(0n)] },
      decimals: { [PXWHSK_XC]: fail() },
      prices: { [PXWETH]: fail('PriceStale') },
    })

    const result = await liveChainAdapter.enrichPools(pools)

    // A genuinely zero-supply pool is `known`, distinct from `b`'s unknown size.
    const sizeA = result.pools[a.toLowerCase()].size
    expect(sizeA.known).toBe(true)
    if (sizeA.known) expect(sizeA.totalSupplyAssets).toBe(0n)
    expect(result.pools[b.toLowerCase()].size.known).toBe(false)

    expect(result.tokens[PXWHSK_XC].decimals.valid).toBe(false)
    expect(result.tokens[PXWETH].price.available).toBe(false)
    expect(result.tokens[PXUSDT].decimals.valid).toBe(true)
  })
})

describe('enrichPools — the zero-pool path CreatePoolPanel depends on', () => {
  it('skips phase 1 and still verifies every registry token', async () => {
    driveBatches([], {})
    const result = await liveChainAdapter.enrichPools([])

    // One batch, not two: no pool means no router to resolve.
    expect(mockReads).toHaveBeenCalledTimes(1)
    expect(Object.keys(result.pools)).toHaveLength(0)
    for (const token of REGISTRY_TOKENS) {
      expect(result.tokens[token].decimals.valid).toBe(true)
    }
  })
})

describe('enrichPools — a dead transport, not a reverting call', () => {
  it('degrades to all-unavailable instead of rejecting', async () => {
    const pool = nextPool()
    const pools = [rawPool(pool, PXWETH)]
    // `allowFailure` only covers a call that reverts. An unreachable RPC makes
    // readContracts itself reject — enrichPools promises never to.
    mockReads.mockReset()
    mockReads.mockRejectedValue(new Error('fetch failed'))

    const result = await liveChainAdapter.enrichPools(pools)

    expect(result.pools[pool.toLowerCase()].size.known).toBe(false)
    for (const token of REGISTRY_TOKENS) {
      expect(result.tokens[token].decimals.valid).toBe(false)
      expect(result.tokens[token].price.available).toBe(false)
    }
  })
})
