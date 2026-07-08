/**
 * Borrow same-chain (U11, R19). Borrow pxUSDT against collateral — self or, with
 * prior borrow-delegation, on-behalf of another borrower. No approval (you are
 * receiving funds); the pre-flight validates live max-borrow, available pool
 * liquidity, price freshness, and delegation before anything is signed.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { HASHKEY } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { availableLiquidity } from '#/lib/math'
import { preflightBorrow, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useBorrow(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const borrow = useCallback(
    async (amount: bigint, onBehalf?: Address) => {
      const borrower = onBehalf ?? address
      if (!borrower || !address) return
      const isThirdParty = borrower !== address
      const { chain } = getAdapters()

      const [totals, maxBorrow, price, delegation] = await Promise.all([
        chain.getMarketTotals(market.poolAddress),
        chain.getMaxBorrowAmount(market.poolAddress, borrower),
        chain.getPrice(market.collateralAddress),
        isThirdParty
          ? chain.getBorrowDelegation(market.poolAddress, borrower, address)
          : Promise.resolve(0n),
      ])

      await write.run({
        preflight: preflightBorrow({
          amount,
          maxBorrowAmount: maxBorrow,
          availableLiquidity: availableLiquidity(
            totals.totalSupplyAssets,
            totals.totalBorrowAssets,
          ),
          priceUpdatedAt: price.updatedAt,
          nowSeconds: unixNow(),
          onBehalf: isThirdParty,
          hasDelegation: isThirdParty ? delegation >= amount : true,
        }),
        send: () =>
          chain.borrowDebt(
            market.poolAddress,
            { amount, chainId: BigInt(HASHKEY.id), destGasLimit: 0 },
            borrower,
          ),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market.poolAddress, market.collateralAddress, write],
  )

  return { ...write, borrow }
}
