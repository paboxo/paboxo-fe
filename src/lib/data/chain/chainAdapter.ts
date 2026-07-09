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
  waitForTransactionReceipt,
  writeContract,
} from '@wagmi/core'
import { zeroAddress } from 'viem'
import { CORE, HASHKEY, HELPER_UTILS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
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
  PriceData,
  RepayParams,
  SwapParams,
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
