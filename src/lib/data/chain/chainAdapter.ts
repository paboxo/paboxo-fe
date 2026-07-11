/**
 * Live chain adapter (U18). Implements the `ChainAdapter` interface against the
 * real Paboxo contracts on HashKey 177 via `@wagmi/core` — reads with
 * `readContract`; writes broadcast with `writeContract` and return the hash, and
 * the caller (`useWriteAction`) awaits `waitForReceipt` so the tx-state machine can
 * show a distinct pending phase. Enabled by `VITE_DATA_MODE=live`; the hooks and
 * UI are unchanged from mock mode (KTD10).
 *
 * Two-address rule (R7): writes target the LendingPool; accounting reads resolve
 * `LendingPool(pool).router()` at runtime (cached). IsHealthy / InterestRateModel
 * take the router.
 *
 * Collateral value, max-borrow, and the position address are derived directly
 * from the router (`addressPositions`, `collateralToken`, `borrowToken`, `ltv`)
 * plus the price oracle — NOT from HelperUtils, whose address is unset and which
 * would degrade every borrow to a 0 max-borrow. The client-side max-borrow math
 * mirrors senja (`collateral × price × ltv / borrowPrice − debt`).
 *
 * Not wired here (by scope / infra): createLendingPool (excluded), and the Base
 * CCIP sender (quote / supplyToHashKey) which is not deployed yet.
 */
import {
  getGasPrice,
  readContract,
  readContracts,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core'
import { formatUnits, parseUnits, zeroAddress } from 'viem'
import { CORE, HASHKEY } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import {
  erc20Abi,
  interestRateModelAbi,
  isHealthyAbi,
  lendingPoolAbi,
  lendingPoolRouterAbi,
  paboxoSharesTokenAbi,
  tokenDataStreamAbi,
} from '#/lib/contracts/abis'
import { wagmiConfig } from '#/lib/web3/config'
import type {
  BorrowParams,
  ChainAdapter,
  CreatePoolParams,
  Hash,
  IrmParams,
  LiquidatableStatus,
  MarketTotals,
  PoolEnrichment,
  PoolsEnrichment,
  PriceData,
  RawPool,
  RepayParams,
  SwapParams,
  TokenEnrichment,
  VerifiedDecimals,
} from '../types'

const CHAIN_ID = HASHKEY.id

// ---- runtime resolution (two-address rule), cached per address ----

const routerCache = new Map<string, Address>()
const sharesTokenCache = new Map<string, Address>()

async function resolveRouter(pool: Address): Promise<Address> {
  const key = pool.toLowerCase()
  const cached = routerCache.get(key)
  if (cached) return cached
  const router = await readContract(wagmiConfig, {
    chainId: CHAIN_ID,
    address: pool,
    abi: lendingPoolAbi,
    functionName: 'router',
  })
  routerCache.set(key, router)
  return router
}

async function resolveSharesToken(router: Address): Promise<Address> {
  const key = router.toLowerCase()
  const cached = sharesTokenCache.get(key)
  if (cached) return cached
  const sharesToken = await readContract(wagmiConfig, {
    chainId: CHAIN_ID,
    address: router,
    abi: lendingPoolRouterAbi,
    functionName: 'sharesToken',
  })
  sharesTokenCache.set(key, sharesToken)
  return sharesToken
}

// The router's collateral token, borrow token, and LTV are immutable per pool.
const collateralTokenCache = new Map<string, Address>()
const borrowTokenCache = new Map<string, Address>()
const ltvCache = new Map<string, bigint>()

/** Oracle price is reported at 8 decimals (matches `toWholeNumber(price, 8)` in
 *  the position/withdraw hooks). */
const PRICE_DECIMALS = 8

async function resolveRouterAddressField(
  router: Address,
  field: 'collateralToken' | 'borrowToken',
  cache: Map<string, Address>,
): Promise<Address> {
  const key = router.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached
  const value = await readContract(wagmiConfig, {
    chainId: CHAIN_ID,
    address: router,
    abi: lendingPoolRouterAbi,
    functionName: field,
  })
  cache.set(key, value)
  return value
}

const resolveCollateralToken = (router: Address) =>
  resolveRouterAddressField(router, 'collateralToken', collateralTokenCache)

const resolveBorrowToken = (router: Address) =>
  resolveRouterAddressField(router, 'borrowToken', borrowTokenCache)

async function resolveLtv(router: Address): Promise<bigint> {
  const key = router.toLowerCase()
  if (ltvCache.has(key)) return ltvCache.get(key) as bigint
  const ltv = await readContract(wagmiConfig, {
    chainId: CHAIN_ID,
    address: router,
    abi: lendingPoolRouterAbi,
    functionName: 'ltv',
  })
  ltvCache.set(key, ltv)
  return ltv
}

/** Latest oracle price for a token, or a zero/stale reading when the feed
 *  reverts (past its 1h freshness window) so pre-flight can block. */
async function fetchPrice(token: Address): Promise<PriceData> {
  try {
    const result = await readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: CORE.tokenDataStream,
      abi: tokenDataStreamAbi,
      functionName: 'latestRoundData',
      args: [token],
    })
    // (roundId, price, startedAt, updatedAt, answeredInRound)
    return { price: result[1], updatedAt: Number(result[3]) }
  } catch {
    return { price: 0n, updatedAt: 0 }
  }
}

const tokenDecimals = (token: Address): number => {
  // Record indexing is typed non-nullish, but an unknown token is genuinely
  // absent at runtime — treat the lookup as possibly-undefined.
  const entry = TOKEN_REGISTRY[token.toLowerCase()] as
    | { decimals: number }
    | undefined
  return entry?.decimals ?? 18
}

// ---- batched enrichment (two phases; see enrichPools) ----

/** One entry of a batched read. Kept shaped so a call site cannot omit a field. */
interface BatchCall {
  chainId: number
  address: Address
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
}

/** `readContracts` with `allowFailure` yields this per call. */
type BatchResult =
  { status: 'success'; result: unknown } | { status: 'failure'; error: unknown }

/**
 * One multicall. `allowFailure` stays at its default `true`, so a *reverting
 * call* lands as `status: 'failure'` instead of collapsing the batch.
 *
 * `allowFailure` says nothing about a *dead transport*: an unreachable RPC makes
 * `readContracts` itself reject. `enrichPools` promises never to reject, so the
 * whole batch degrades to per-call failures here — every field then reads as
 * unavailable, which is exactly what an unreadable chain means.
 *
 * The same catch also swallows an *encoding* error — a mistyped `functionName`
 * or a wrong arg tuple — which is a bug, not an outage, and would otherwise be
 * indistinguishable from one. Log it in DEV so it surfaces at authoring time.
 */
async function batch(contracts: BatchCall[]): Promise<BatchResult[]> {
  try {
    return await readContracts(wagmiConfig, {
      contracts: contracts as never,
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[chain] batched read rejected; degrading to unavailable', {
        error,
        functionNames: contracts.map((c) => c.functionName),
      })
    }
    return contracts.map(() => ({ status: 'failure' as const, error }))
  }
}

const isAddress = (v: unknown): v is Address =>
  typeof v === 'string' && v.startsWith('0x')

const asBigInt = (r: BatchResult | undefined): bigint | undefined =>
  r?.status === 'success' && typeof r.result === 'bigint' ? r.result : undefined

/** Compare the on-chain decimals against the registry. Both invalid arms drop
 *  the token — an unreadable value is no more trustworthy than a wrong one. */
function verifyDecimals(
  registry: number,
  r: BatchResult | undefined,
): VerifiedDecimals {
  if (r?.status !== 'success' || typeof r.result !== 'number') {
    return { valid: false, reason: 'unreadable', registry }
  }
  if (r.result !== registry) {
    return { valid: false, reason: 'mismatch', registry, onChain: r.result }
  }
  return { valid: true, decimals: registry }
}

/**
 * Broadcast a write with an explicit legacy `gasPrice`. HashKey enforces a
 * minimum gas price that viem's default fee estimation undershoots ("transaction
 * gas price below minimum"), so read the RPC's suggested price (which respects
 * the floor) and bump it 25% to clear it on a busy block. A present `gasPrice`
 * also forces a legacy (type-0) transaction.
 */
interface WriteArgs {
  address: Address
  abi: readonly unknown[]
  functionName: string
  args?: readonly unknown[]
}
async function writeWithGas(params: WriteArgs): Promise<Hash> {
  const gasPrice = await getGasPrice(wagmiConfig, { chainId: CHAIN_ID })
  // A present gasPrice forces a legacy (type-0) tx that clears HashKey's floor.
  return writeContract(wagmiConfig, {
    ...params,
    gasPrice: (gasPrice * 125n) / 100n,
  })
}

export const liveChainAdapter: ChainAdapter = {
  // ---------------------------------------------------------------- reads ----

  async getMarketTotals(pool): Promise<MarketTotals> {
    const router = await resolveRouter(pool)
    const [
      totalSupplyAssets,
      totalBorrowAssets,
      totalBorrowShares,
      sharesToken,
    ] = await Promise.all([
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'totalSupplyAssets',
      }),
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'totalBorrowAssets',
      }),
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'totalBorrowShares',
      }),
      resolveSharesToken(router),
    ])
    // No direct totalSupplyShares getter — read the shares token's total supply
    // (raw 18dp; pairs with balanceOf in getUserSupplyShares for supplyValue).
    const totalSupplyShares = await readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: sharesToken,
      abi: paboxoSharesTokenAbi,
      functionName: 'totalSupply',
    })
    return {
      totalSupplyAssets,
      totalBorrowAssets,
      totalBorrowShares,
      totalSupplyShares,
    }
  },

  async getBorrowRateWad(pool) {
    const router = await resolveRouter(pool)
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: CORE.interestRateModel,
      abi: interestRateModelAbi,
      functionName: 'calculateBorrowRate',
      args: [router],
    })
  },

  async getIrmParams(pool): Promise<IrmParams> {
    const router = await resolveRouter(pool)
    const irm = {
      chainId: CHAIN_ID,
      address: CORE.interestRateModel,
      abi: interestRateModelAbi,
    } as const
    const [
      baseRateWad,
      rateAtOptimalWad,
      maxRateWad,
      optimalUtilWad,
      maxUtilWad,
    ] = await Promise.all([
      readContract(wagmiConfig, {
        ...irm,
        functionName: 'lendingPoolBaseRate',
        args: [router],
      }),
      readContract(wagmiConfig, {
        ...irm,
        functionName: 'lendingPoolRateAtOptimal',
        args: [router],
      }),
      readContract(wagmiConfig, {
        ...irm,
        functionName: 'lendingPoolMaxRate',
        args: [router],
      }),
      readContract(wagmiConfig, {
        ...irm,
        functionName: 'lendingPoolOptimalUtilization',
        args: [router],
      }),
      readContract(wagmiConfig, {
        ...irm,
        functionName: 'lendingPoolMaxUtilization',
        args: [router],
      }),
    ])
    return {
      baseRateWad,
      rateAtOptimalWad,
      maxRateWad,
      optimalUtilWad,
      maxUtilWad,
    }
  },

  getPrice(token): Promise<PriceData> {
    return fetchPrice(token)
  },

  /**
   * Two batched phases, because `totalSupplyAssets()` is read from a pool's
   * *router* and the router address is itself an on-chain read.
   *
   *   phase 1 — `router()` for every pool missing from `routerCache`
   *   phase 2 — balances + rate per routed pool, then decimals + price per token
   *
   * Never rejects. A reverting call marks one field unavailable; the rest of the
   * list still renders. `getPrice`'s catch-all-to-zero cannot express that, which
   * is why this method exists rather than a loop over it.
   */
  async enrichPools(pools: RawPool[]): Promise<PoolsEnrichment> {
    const registryTokens = Object.keys(TOKEN_REGISTRY)

    // ---- phase 1: resolve routers we do not already hold ----
    const uncached = pools.filter(
      (p) => !routerCache.has(p.lendingPool.toLowerCase()),
    )
    if (uncached.length > 0) {
      const routers = await batch(
        uncached.map((p) => ({
          chainId: CHAIN_ID,
          address: p.lendingPool,
          abi: lendingPoolAbi,
          functionName: 'router',
        })),
      )
      uncached.forEach((p, i) => {
        // `.at()` (not `[i]`) so a short result array is typed, not assumed.
        const r = routers.at(i)
        if (r?.status === 'success' && isAddress(r.result)) {
          routerCache.set(p.lendingPool.toLowerCase(), r.result)
          // The indexer also reports a router. The chain is the source of truth
          // for the address we read balances from; a disagreement is worth
          // knowing about, and comparing costs nothing here.
          if (
            import.meta.env.DEV &&
            r.result.toLowerCase() !== p.router.toLowerCase()
          ) {
            console.warn(
              `[chain] router mismatch for pool ${p.lendingPool}: chain says ${r.result}, indexer says ${p.router}`,
            )
          }
        }
      })
    }

    const routed = pools.filter((p) =>
      routerCache.has(p.lendingPool.toLowerCase()),
    )

    // ---- phase 2: everything else, in one batch ----
    const contracts: BatchCall[] = []
    for (const p of routed) {
      const router = routerCache.get(p.lendingPool.toLowerCase()) as Address
      contracts.push(
        {
          chainId: CHAIN_ID,
          address: router,
          abi: lendingPoolRouterAbi,
          functionName: 'totalSupplyAssets',
        },
        {
          chainId: CHAIN_ID,
          address: router,
          abi: lendingPoolRouterAbi,
          functionName: 'totalBorrowAssets',
        },
        {
          chainId: CHAIN_ID,
          address: CORE.interestRateModel,
          abi: interestRateModelAbi,
          functionName: 'calculateBorrowRate',
          args: [router],
        },
      )
    }
    for (const token of registryTokens) {
      contracts.push(
        {
          chainId: CHAIN_ID,
          address: token as Address,
          abi: erc20Abi,
          functionName: 'decimals',
        },
        {
          chainId: CHAIN_ID,
          address: CORE.tokenDataStream,
          abi: tokenDataStreamAbi,
          functionName: 'latestRoundData',
          args: [token],
        },
      )
    }
    const results = await batch(contracts)

    // ---- assemble ----
    const poolMap: Record<string, PoolEnrichment> = {}
    for (const p of pools) {
      poolMap[p.lendingPool.toLowerCase()] = {
        pool: p.lendingPool,
        size: { known: false },
      }
    }
    routed.forEach((p, i) => {
      const supply = asBigInt(results.at(i * 3))
      const borrow = asBigInt(results.at(i * 3 + 1))
      const rate = asBigInt(results.at(i * 3 + 2))
      if (supply === undefined || borrow === undefined || rate === undefined) {
        return // stays `{ known: false }` — a transport problem, not a hidden pool
      }
      poolMap[p.lendingPool.toLowerCase()] = {
        pool: p.lendingPool,
        size: {
          known: true,
          totalSupplyAssets: supply,
          totalBorrowAssets: borrow,
          borrowRateWad: rate,
        },
      }
    })

    const tokenMap: Record<string, TokenEnrichment> = {}
    const tokenBase = routed.length * 3
    registryTokens.forEach((token, i) => {
      const decimalsResult = results.at(tokenBase + i * 2)
      const priceResult = results.at(tokenBase + i * 2 + 1)

      const decimals = verifyDecimals(
        TOKEN_REGISTRY[token].decimals,
        decimalsResult,
      )

      // (roundId, price, startedAt, updatedAt, answeredInRound)
      let price: TokenEnrichment['price'] = { available: false }
      if (
        priceResult?.status === 'success' &&
        Array.isArray(priceResult.result)
      ) {
        const tuple = priceResult.result as ReadonlyArray<bigint>
        price = {
          available: true,
          data: { price: tuple[1], updatedAt: Number(tuple[3]) },
        }
      }

      tokenMap[token] = { decimals, price }
    })

    return { pools: poolMap, tokens: tokenMap }
  },

  async getUserBorrowShares(pool, user) {
    const router = await resolveRouter(pool)
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: router,
      abi: lendingPoolRouterAbi,
      functionName: 'userBorrowShares',
      args: [user],
    })
  },

  async getUserSupplyShares(pool, user) {
    const router = await resolveRouter(pool)
    const sharesToken = await resolveSharesToken(router)
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: sharesToken,
      abi: paboxoSharesTokenAbi,
      functionName: 'balanceOf',
      args: [user],
    })
  },

  async getPositionAddress(pool, user) {
    const router = await resolveRouter(pool)
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: router,
      abi: lendingPoolRouterAbi,
      functionName: 'addressPositions',
      args: [user],
    })
  },

  /**
   * The user's collateral as a USD value scaled to the borrow token's decimals
   * (6) — the shape `usePosition` / `useWithdraw` consume. Reads the position's
   * on-chain collateral balance directly (senja `useBorrowPoolData.ts:155-199`),
   * so it no longer degrades to 0 and the "supply collateral first" gate clears
   * once collateral is supplied.
   */
  async getCollateralValue(pool, user) {
    const router = await resolveRouter(pool)
    const position = await this.getPositionAddress(pool, user)
    if (position === zeroAddress) return 0n
    const collateralToken = await resolveCollateralToken(router)
    const [balance, price] = await Promise.all([
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: collateralToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [position],
      }),
      fetchPrice(collateralToken),
    ])
    if (balance === 0n || price.price === 0n) return 0n
    // USD (6dp) = balance/10^colDec × price/10^8 × 10^6
    const colDec = tokenDecimals(collateralToken)
    return (
      (balance * price.price * 1_000_000n) /
      (10n ** BigInt(colDec) * 10n ** BigInt(PRICE_DECIMALS))
    )
  },

  /**
   * Client-side max-borrow, mirroring senja's `maxBorrowable`
   * (`useBorrowPoolData.ts:315`): collateral USD × LTV / borrow price, minus
   * current debt, in borrow-token decimals. Replaces the HelperUtils read that
   * returned 0 (its address is unset) and blocked every borrow.
   */
  async getMaxBorrowAmount(pool, user) {
    const router = await resolveRouter(pool)
    const position = await this.getPositionAddress(pool, user)
    if (position === zeroAddress) return 0n
    const [collateralToken, borrowToken, ltvRaw] = await Promise.all([
      resolveCollateralToken(router),
      resolveBorrowToken(router),
      resolveLtv(router),
    ])
    if (ltvRaw === 0n) return 0n
    const [
      balance,
      collateralPrice,
      borrowPrice,
      userBorrowShares,
      totalBorrowAssets,
      totalBorrowShares,
    ] = await Promise.all([
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: collateralToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [position],
      }),
      fetchPrice(collateralToken),
      fetchPrice(borrowToken),
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'userBorrowShares',
        args: [user],
      }),
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'totalBorrowAssets',
      }),
      readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: router,
        abi: lendingPoolRouterAbi,
        functionName: 'totalBorrowShares',
      }),
    ])
    if (balance === 0n || collateralPrice.price === 0n || borrowPrice.price === 0n)
      return 0n

    const colDec = tokenDecimals(collateralToken)
    const borDec = tokenDecimals(borrowToken)
    const colUsd =
      Number(formatUnits(balance, colDec)) *
      Number(formatUnits(collateralPrice.price, PRICE_DECIMALS))
    const ltvFraction = Number(ltvRaw) / 1e18
    const borrowPriceUsd = Number(formatUnits(borrowPrice.price, PRICE_DECIMALS))
    if (borrowPriceUsd === 0) return 0n
    const maxTokens = (colUsd * ltvFraction) / borrowPriceUsd
    const maxRaw = parseUnits(maxTokens.toFixed(borDec), borDec)

    const userBorrowAmount =
      totalBorrowShares > 0n
        ? (userBorrowShares * totalBorrowAssets) / totalBorrowShares
        : 0n
    return maxRaw > userBorrowAmount ? maxRaw - userBorrowAmount : 0n
  },

  async checkLiquidatable(pool, user): Promise<LiquidatableStatus> {
    const router = await resolveRouter(pool)
    const [liquidatable, borrowValueUsd, maxCollateralValueUsd, bonusUsd] =
      await readContract(wagmiConfig, {
        chainId: CHAIN_ID,
        address: CORE.isHealthy,
        abi: isHealthyAbi,
        functionName: 'checkLiquidatable',
        args: [user, router],
      })
    return { liquidatable, borrowValueUsd, maxCollateralValueUsd, bonusUsd }
  },

  async getAllowance(token, owner, spender) {
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, spender],
    })
  },

  async getTokenBalance(token, user) {
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [user],
    })
  },

  async getBorrowDelegation(pool, owner, delegate) {
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'borrowDelegation',
      args: [owner, delegate],
    })
  },

  async getWithdrawDelegation(pool, owner, delegate) {
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'withdrawDelegation',
      args: [owner, delegate],
    })
  },

  // --------------------------------------------------------------- writes ----

  async approve(token, spender, amount) {
    const hash = await writeWithGas({
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    })
    return hash
  },

  async supplyLiquidity(pool, onBehalf, amount) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'supplyLiquidity',
      args: [onBehalf, amount],
    })
    return hash
  },

  async supplyCollateral(pool, onBehalf, amount) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'supplyCollateral',
      args: [onBehalf, amount],
    })
    return hash
  },

  async borrowDebt(pool, params: BorrowParams, onBehalf) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'borrowDebt',
      args: [
        {
          amount: params.amount,
          chainId: params.chainId,
          destGasLimit: BigInt(params.destGasLimit),
        },
        onBehalf,
      ],
    })
    return hash
  },

  async repayWithSelectedToken(pool, params: RepayParams) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'repayWithSelectedToken',
      args: [
        {
          user: params.user,
          token: params.token,
          shares: params.shares,
          amountOutMinimum: params.amountOutMinimum,
          fromPosition: params.fromPosition,
          fee: params.fee,
        },
      ],
    })
    return hash
  },

  async withdrawCollateral(pool, amount, to) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'withdrawCollateral',
      args: [amount, to],
    })
    return hash
  },

  async withdrawLiquidity(pool, shares, to) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'withdrawLiquidity',
      args: [shares, to],
    })
    return hash
  },

  async liquidation(pool, borrowers) {
    // The contract liquidates a single borrower per call.
    if (borrowers.length === 0) {
      throw new Error('liquidation requires a borrower')
    }
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'liquidation',
      args: [borrowers[0]],
    })
    return hash
  },

  async swapCollateral(pool, params: SwapParams) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'swapTokenByPosition',
      args: [
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          amountOutMinimum: params.amountOutMinimum,
          fee: params.fee,
        },
      ],
    })
    return hash
  },

  async approveBorrowDelegation(pool, delegate, amount) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'approveBorrowDelegation',
      args: [delegate, amount],
    })
    return hash
  },

  async approveWithdrawDelegation(pool, delegate, allowed) {
    const hash = await writeWithGas({
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'approveWithdrawDelegation',
      args: [delegate, allowed],
    })
    return hash
  },

  createLendingPool(
    _params: CreatePoolParams,
  ): Promise<{ hash: Hash; pool: Address }> {
    // Excluded from this delivery — use mock mode for pool creation.
    return Promise.reject(
      new Error('createLendingPool is not enabled in the live chain adapter'),
    )
  },

  async waitForReceipt(hash) {
    // Bound the wait so a dropped/underpriced tx settles the promise instead of
    // stranding the caller's tx-state machine in 'pending' forever; viem rejects
    // with a timeout error the wrapper surfaces as a failure the user can retry.
    await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 120_000 })
  },

  // ---- cross-chain: PaboxoCCIPSender is not deployed on Base yet ----
  quoteCrossChainSupply() {
    return Promise.reject(
      new Error('Cross-chain sender is not deployed on Base yet'),
    )
  },

  supplyToHashKey() {
    return Promise.reject(
      new Error('Cross-chain sender is not deployed on Base yet'),
    )
  },
}
