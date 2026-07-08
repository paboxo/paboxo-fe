/**
 * Supply collateral (U10, R18). A borrower supplies the collateral token into
 * their Position (auto-created), credited to `onBehalf` (self by default). Exact
 * approval to the pool → supplyCollateral, through the one write wrapper.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { preflightSupplyCollateral, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useSupplyCollateral(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const supply = useCallback(
    async (amount: bigint, onBehalf?: Address) => {
      const beneficiary = onBehalf ?? address
      if (!beneficiary) return
      const { chain } = getAdapters()
      const price = await chain.getPrice(market.collateralAddress)
      await write.run({
        approval: {
          token: market.collateralAddress,
          spender: market.poolAddress,
          amount,
        },
        preflight: preflightSupplyCollateral({
          amount,
          priceUpdatedAt: price.updatedAt,
          nowSeconds: unixNow(),
        }),
        send: () =>
          chain.supplyCollateral(market.poolAddress, beneficiary, amount),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market.collateralAddress, market.poolAddress, write],
  )

  return { ...write, supply }
}
