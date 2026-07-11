import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getGasPrice,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core'
import { zeroAddress } from 'viem'
import { liveChainAdapter } from './chainAdapter'

// No live RPC — mock @wagmi/core so we can assert the adapter's call shape.
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn(),
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  getGasPrice: vi.fn().mockResolvedValue(1_000_000_000n),
}))
// Avoid initializing the real wallet config (WalletConnect) in tests.
vi.mock('#/lib/web3/config', () => ({ wagmiConfig: { mock: true } }))

const mockRead = vi.mocked(readContract)
const mockWrite = vi.mocked(writeContract)
const mockWait = vi.mocked(waitForTransactionReceipt)

const ROUTER = '0xR0000000000000000000000000000000000000ee' as const
const SHARES = '0x5000000000000000000000000000000000000000' as const
const USER = '0x1111111111111111111111111111111111111111' as const
const HASH = `0x${'ab'.repeat(32)}` as const

// A distinct pool per test so the module-level router cache never masks a read.
let poolSeq = 0
function nextPool(): `0x${string}` {
  poolSeq += 1
  return `0x${poolSeq.toString(16).padStart(40, '0')}`
}

function readByFunction(name: string): bigint | string {
  switch (name) {
    case 'router':
      return ROUTER
    case 'sharesToken':
      return SHARES
    case 'totalSupplyAssets':
      return 2_600_000_000000n
    case 'totalBorrowAssets':
      return 1_586_000_000000n
    case 'totalBorrowShares':
      return 1_500_000_000000n
    case 'totalSupply':
      return 1_000n * 10n ** 18n
    case 'lendingPoolBaseRate':
      return (5n * 10n ** 18n) / 1000n // 0.5%
    case 'lendingPoolRateAtOptimal':
      return (7n * 10n ** 18n) / 100n // 7%
    case 'lendingPoolMaxRate':
      return (120n * 10n ** 18n) / 100n // 120%
    case 'lendingPoolOptimalUtilization':
      return (75n * 10n ** 18n) / 100n // 75%
    case 'lendingPoolMaxUtilization':
      return (90n * 10n ** 18n) / 100n // 90%
    default:
      return 0n
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRead.mockImplementation((_config, params) =>
    Promise.resolve(
      readByFunction((params as { functionName: string }).functionName),
    ),
  )
  mockWrite.mockResolvedValue(HASH)
  mockWait.mockResolvedValue({} as never)
})

// Covers R5, R29; the two-address rule.
describe('liveChainAdapter reads', () => {
  it('resolves the router from the pool and reads totals from the router', async () => {
    const pool = nextPool()
    const totals = await liveChainAdapter.getMarketTotals(pool)

    // router() is read on the POOL.
    const routerCall = mockRead.mock.calls.find(
      ([, p]) => (p as { functionName: string }).functionName === 'router',
    )
    expect((routerCall?.[1] as { address: string }).address).toBe(pool)

    // Accounting totals are read on the ROUTER, not the pool.
    const totalsCall = mockRead.mock.calls.find(
      ([, p]) =>
        (p as { functionName: string }).functionName === 'totalSupplyAssets',
    )
    expect((totalsCall?.[1] as { address: string }).address).toBe(ROUTER)

    expect(totals.totalSupplyAssets).toBe(2_600_000_000000n)
    expect(totals.totalBorrowAssets).toBe(1_586_000_000000n)
    expect(totals.totalSupplyShares).toBe(1_000n * 10n ** 18n)
  })

  it('reads the IRM curve params from the router (WAD)', async () => {
    const pool = nextPool()
    const params = await liveChainAdapter.getIrmParams(pool)
    // Read on the InterestRateModel, keyed by the resolved router.
    const irmCall = mockRead.mock.calls.find(
      ([, p]) =>
        (p as { functionName: string }).functionName === 'lendingPoolMaxRate',
    )
    expect((irmCall?.[1] as { args: readonly unknown[] }).args).toEqual([
      ROUTER,
    ])
    expect(params.baseRateWad).toBe((5n * 10n ** 18n) / 1000n)
    expect(params.rateAtOptimalWad).toBe((7n * 10n ** 18n) / 100n)
    expect(params.maxRateWad).toBe((120n * 10n ** 18n) / 100n)
    expect(params.optimalUtilWad).toBe((75n * 10n ** 18n) / 100n)
    expect(params.maxUtilWad).toBe((90n * 10n ** 18n) / 100n)
  })

  it('reads a fresh price and its updatedAt', async () => {
    mockRead.mockResolvedValueOnce([0n, 5_000_000n, 0n, 1_700_000_000n, 0n])
    const price = await liveChainAdapter.getPrice(USER)
    expect(price.price).toBe(5_000_000n)
    expect(price.updatedAt).toBe(1_700_000_000)
  })

  it('treats a reverting (stale) price feed as unavailable', async () => {
    mockRead.mockRejectedValueOnce(new Error('PriceStale'))
    const price = await liveChainAdapter.getPrice(USER)
    // updatedAt 0 → pre-flight's freshness check blocks the action.
    expect(price.price).toBe(0n)
    expect(price.updatedAt).toBe(0)
  })

})

// Covers R1, R7, AE1: collateral value, position, and max-borrow are derived
// from the router + oracle (senja parity), not the unset HelperUtils.
describe('liveChainAdapter position-derived reads', () => {
  const POSITION = '0xP0000000000000000000000000000000000000aa' as const
  // Registry tokens so decimals resolve: pxWHSK (18dp) collateral, pxUSDT (6dp) borrow.
  const COLLATERAL = '0xc3be8ab4ca0cefe3119a765b324bbdf54a16a65b' as const
  const BORROW = '0x4852bc014401415c4ce4788a04cab019d1527aaa' as const

  function mockChain(opts: {
    position: `0x${string}`
    collateralBalance: bigint
    colPrice: bigint
    borPrice: bigint
    userBorrowShares?: bigint
    ltv?: bigint
  }) {
    const {
      position,
      collateralBalance,
      colPrice,
      borPrice,
      userBorrowShares = 0n,
      ltv = 7n * 10n ** 17n, // 0.7 in WAD
    } = opts
    mockRead.mockImplementation((_config, params) => {
      const p = params as { functionName: string; args?: readonly unknown[] }
      switch (p.functionName) {
        case 'router':
          return Promise.resolve(ROUTER)
        case 'addressPositions':
          return Promise.resolve(position)
        case 'collateralToken':
          return Promise.resolve(COLLATERAL)
        case 'borrowToken':
          return Promise.resolve(BORROW)
        case 'ltv':
          return Promise.resolve(ltv)
        case 'balanceOf':
          return Promise.resolve(collateralBalance)
        case 'userBorrowShares':
          return Promise.resolve(userBorrowShares)
        case 'totalBorrowAssets':
          return Promise.resolve(1_000_000000n)
        case 'totalBorrowShares':
          return Promise.resolve(1_000_000000n)
        case 'latestRoundData': {
          const token = String(p.args?.[0] ?? '').toLowerCase()
          const price = token === COLLATERAL.toLowerCase() ? colPrice : borPrice
          return Promise.resolve([0n, price, 0n, 1_700_000_000n, 0n])
        }
        default:
          return Promise.resolve(0n)
      }
    })
  }

  it('reads the position address from the router (not HelperUtils)', async () => {
    mockChain({ position: POSITION, collateralBalance: 0n, colPrice: 0n, borPrice: 0n })
    expect(await liveChainAdapter.getPositionAddress(nextPool(), USER)).toBe(
      POSITION,
    )
  })

  it('returns 0 collateral when the user has no position', async () => {
    mockChain({
      position: zeroAddress,
      collateralBalance: 5n,
      colPrice: 1n * 10n ** 8n,
      borPrice: 1n * 10n ** 8n,
    })
    expect(await liveChainAdapter.getCollateralValue(nextPool(), USER)).toBe(0n)
  })

  it('derives collateral USD (6dp) from balanceOf(position) × price', async () => {
    // 10 pxWHSK (18dp) at $2 (8dp) = $20 → 20_000000 (6dp)
    mockChain({
      position: POSITION,
      collateralBalance: 10n * 10n ** 18n,
      colPrice: 2n * 10n ** 8n,
      borPrice: 1n * 10n ** 8n,
    })
    expect(await liveChainAdapter.getCollateralValue(nextPool(), USER)).toBe(
      20_000000n,
    )
  })

  it('derives max-borrow from collateral × ltv / borrow price minus debt', async () => {
    // colUsd $20 × ltv 0.7 = $14; borrow price $1 → 14 pxUSDT (6dp)
    mockChain({
      position: POSITION,
      collateralBalance: 10n * 10n ** 18n,
      colPrice: 2n * 10n ** 8n,
      borPrice: 1n * 10n ** 8n,
    })
    expect(await liveChainAdapter.getMaxBorrowAmount(nextPool(), USER)).toBe(
      14_000000n,
    )
  })

  it('blocks borrow (max 0) when the position holds no collateral', async () => {
    mockChain({
      position: POSITION,
      collateralBalance: 0n,
      colPrice: 2n * 10n ** 8n,
      borPrice: 1n * 10n ** 8n,
    })
    expect(await liveChainAdapter.getMaxBorrowAmount(nextPool(), USER)).toBe(0n)
  })
})

describe('liveChainAdapter writes', () => {
  it('broadcasts supply to the pool and returns the hash (receipt waited by the caller)', async () => {
    const pool = nextPool()
    const hash = await liveChainAdapter.supplyLiquidity(pool, USER, 1_000_000n)

    expect(mockWrite).toHaveBeenCalledOnce()
    const [, params] = mockWrite.mock.calls[0]
    expect((params as { address: string }).address).toBe(pool)
    expect((params as { functionName: string }).functionName).toBe(
      'supplyLiquidity',
    )
    // The write returns on broadcast; the receipt wait is the wrapper's job.
    expect(mockWait).not.toHaveBeenCalled()
    expect(hash).toBe(HASH)
  })

  it('waitForReceipt awaits the mined receipt for a hash, with a timeout', async () => {
    await liveChainAdapter.waitForReceipt(HASH)
    expect(mockWait).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hash: HASH, timeout: expect.any(Number) }),
    )
  })

  it('liquidates a single borrower on the pool', async () => {
    const pool = nextPool()
    await liveChainAdapter.liquidation(pool, [USER])
    const [, params] = mockWrite.mock.calls[0]
    expect((params as { functionName: string }).functionName).toBe(
      'liquidation',
    )
    expect((params as { args: readonly unknown[] }).args).toEqual([USER])
  })

  it('retries the "gas price below minimum" floor with a higher price, then succeeds', async () => {
    // The node rejects the first (floor) attempt; the retry escalates the price.
    mockWrite.mockReset()
    mockWrite
      .mockRejectedValueOnce(new Error('transaction gas price below minimum'))
      .mockResolvedValueOnce(HASH)

    const hash = await liveChainAdapter.supplyLiquidity(nextPool(), USER, 1n)

    expect(hash).toBe(HASH)
    expect(mockWrite).toHaveBeenCalledTimes(2)
    const g1 = (mockWrite.mock.calls[0][1] as { gasPrice: bigint }).gasPrice
    const g2 = (mockWrite.mock.calls[1][1] as { gasPrice: bigint }).gasPrice
    expect(g2).toBeGreaterThan(g1) // escalated on the rejection
  })

  it('clamps a below-floor RPC gas price up to the HashKey minimum', async () => {
    // eth_gasPrice on HashKey undershoots the enforced floor; the write must
    // still go out at >= the 1_000_000 wei minimum a good tx pays.
    mockWrite.mockReset()
    mockWrite.mockResolvedValueOnce(HASH)
    vi.mocked(getGasPrice).mockResolvedValueOnce(252n)

    await liveChainAdapter.supplyLiquidity(nextPool(), USER, 1n)

    const gasPrice = (mockWrite.mock.calls[0][1] as { gasPrice: bigint })
      .gasPrice
    expect(gasPrice).toBeGreaterThanOrEqual(1_000_000n)
  })

  it('does not retry a non-floor error (e.g. a real revert)', async () => {
    mockWrite.mockReset()
    mockWrite.mockRejectedValueOnce(new Error('execution reverted: nope'))

    await expect(
      liveChainAdapter.supplyLiquidity(nextPool(), USER, 1n),
    ).rejects.toThrow(/execution reverted/)
    expect(mockWrite).toHaveBeenCalledOnce()
  })
})

describe('liveChainAdapter disabled paths', () => {
  it('rejects createLendingPool (excluded from this delivery)', async () => {
    await expect(
      liveChainAdapter.createLendingPool({
        collateralToken: USER,
        borrowToken: USER,
        ltv: 0n,
        seedAmount: 0n,
      }),
    ).rejects.toThrow(/not enabled/)
  })

  it('rejects cross-chain until the Base sender is deployed', async () => {
    await expect(
      liveChainAdapter.supplyToHashKey(nextPool(), 1, USER, 0n, 0, 0n),
    ).rejects.toThrow(/not deployed/)
  })
})
