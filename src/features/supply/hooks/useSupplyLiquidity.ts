/**
 * Supply liquidity (U10, R17). A lender supplies the borrow token (pxUSDT) and
 * receives supply shares credited to `onBehalf` (self by default). Goes through
 * the one write wrapper: exact approval to the pool → supplyLiquidity.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { preflightSupply, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useSupplyLiquidity(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const supply = useCallback(
    async (amount: bigint, onBehalf?: Address) => {
      const beneficiary = onBehalf ?? address
      if (!beneficiary) return
      const { chain } = getAdapters()
      const [totals, price] = await Promise.all([
        chain.getMarketTotals(market.poolAddress),
        chain.getPrice(TOKENS.pxUSDT.address),
      ])
      await write.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: market.poolAddress,
          amount,
        },
        preflight: preflightSupply({
          amount,
          totalSupplyAssets: totals.totalSupplyAssets,
          totalSupplyShares: totals.totalSupplyShares,
          priceUpdatedAt: price.updatedAt,
          nowSeconds: unixNow(),
        }),
        send: () =>
          chain.supplyLiquidity(market.poolAddress, beneficiary, amount),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market.poolAddress, write],
  )

  return { ...write, supply }
}
