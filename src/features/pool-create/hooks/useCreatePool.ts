/**
 * Create a lending pool (U15, R25). A pool creator seeds a new market: approve
 * the borrow token to the Factory (exact seed, ≥ minAmountSupplyLiquidity) →
 * createLendingPool. On success the new pool address is returned so the caller
 * can route to it (it is not in the hardcoded market list until discovery, R6).
 */
import { useCallback } from 'react'
import { CORE, TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { useWriteAction } from '#/lib/tx/useWriteAction'

export interface CreatePoolInput {
  collateralToken: Address
  seedAmount: bigint
  /** Minimum seed liquidity the Factory requires. */
  minSeed: bigint
  /** Loan-to-value, WAD (1e18 = 100%). */
  ltv: bigint
}

export function useCreatePool() {
  const write = useWriteAction()

  const createPool = useCallback(
    async (input: CreatePoolInput): Promise<Address | undefined> => {
      let created: Address | undefined
      const confirmed = await write.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: CORE.lendingPoolFactory,
          amount: input.seedAmount,
        },
        preflight:
          input.seedAmount >= input.minSeed
            ? { enabled: true }
            : {
                enabled: false,
                reason: 'Seed is below the pool’s minimum liquidity.',
              },
        send: async () => {
          const { hash, pool } = await getAdapters().chain.createLendingPool({
            collateralToken: input.collateralToken,
            borrowToken: TOKENS.pxUSDT.address,
            ltv: input.ltv,
            seedAmount: input.seedAmount,
          })
          created = pool
          return hash
        },
        invalidateKeys: [['markets']],
      })
      return confirmed ? created : undefined
    },
    [write],
  )

  return { ...write, createPool }
}
