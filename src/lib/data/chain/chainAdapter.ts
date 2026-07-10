/**
 * Live chain adapter (U18). Implements the `ChainAdapter` interface against the
 * real Paboxo contracts on HashKey 177 via `@wagmi/core` — reads with
 * `readContract`; writes broadcast with `writeContract` and return the hash, and
 * the caller (`useWriteAction`) awaits `waitForReceipt` so the tx-state machine can
 * show a distinct pending phase. Enabled by `VITE_DATA_MODE=live`; the hooks and
 * UI are unchanged from mock mode (KTD10).
 *
 * Two-address rule (R7): writes target the LendingPool; accounting reads resolve
 * `LendingPool(pool).router()` at runtime (cached). HelperUtils reads take the
 * LendingPool; IsHealthy / InterestRateModel take the router.
 *
 * Not wired here (by scope / infra): createLendingPool (excluded), and the Base
 * CCIP sender (quote / supplyToHashKey) which is not deployed yet. HelperUtils
 * reads (max-borrow, collateral value, position address) degrade to 0/zero until
 * its address is supplied — the on-chain contracts still enforce health on write.
 */
import {
  readContract,
  readContracts,
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core'
import { zeroAddress } from 'viem'
import { CORE, HASHKEY, HELPER_UTILS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import {
  erc20Abi,
  helperUtilsAbi,
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
 */
async function batch(contracts: BatchCall[]): Promise<BatchResult[]> {
  try {
    return await readContracts(wagmiConfig, {
      contracts: contracts as never,
    })
  } catch (error) {
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

  async getPrice(token): Promise<PriceData> {
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
      // Feed reverts PriceStale past 1h — surface as stale so pre-flight blocks.
      return { price: 0n, updatedAt: 0 }
    }
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

  async getMaxBorrowAmount(pool, user) {
    if (!HELPER_UTILS) return 0n
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: HELPER_UTILS,
      abi: helperUtilsAbi,
      functionName: 'getMaxBorrowAmount',
      args: [pool, user],
    })
  },

  async getCollateralValue(pool, user) {
    if (!HELPER_UTILS) return 0n
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: HELPER_UTILS,
      abi: helperUtilsAbi,
      functionName: 'getCollateralValue',
      args: [pool, user],
    })
  },

  async getPositionAddress(pool, user) {
    if (!HELPER_UTILS) return zeroAddress
    return readContract(wagmiConfig, {
      chainId: CHAIN_ID,
      address: HELPER_UTILS,
      abi: helperUtilsAbi,
      functionName: 'getAddressPosition',
      args: [pool, user],
    })
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
    const hash = await writeContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    })
    return hash
  },

  async supplyLiquidity(pool, onBehalf, amount) {
    const hash = await writeContract(wagmiConfig, {
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'supplyLiquidity',
      args: [onBehalf, amount],
    })
    return hash
  },

  async supplyCollateral(pool, onBehalf, amount) {
    const hash = await writeContract(wagmiConfig, {
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'supplyCollateral',
      args: [onBehalf, amount],
    })
    return hash
  },

  async borrowDebt(pool, params: BorrowParams, onBehalf) {
    const hash = await writeContract(wagmiConfig, {
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
    const hash = await writeContract(wagmiConfig, {
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
    const hash = await writeContract(wagmiConfig, {
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'withdrawCollateral',
      args: [amount, to],
    })
    return hash
  },

  async withdrawLiquidity(pool, shares, to) {
    const hash = await writeContract(wagmiConfig, {
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
    const hash = await writeContract(wagmiConfig, {
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'liquidation',
      args: [borrowers[0]],
    })
    return hash
  },

  async swapCollateral(pool, params: SwapParams) {
    const hash = await writeContract(wagmiConfig, {
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
    const hash = await writeContract(wagmiConfig, {
      address: pool,
      abi: lendingPoolAbi,
      functionName: 'approveBorrowDelegation',
      args: [delegate, amount],
    })
    return hash
  },

  async approveWithdrawDelegation(pool, delegate, allowed) {
    const hash = await writeContract(wagmiConfig, {
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
