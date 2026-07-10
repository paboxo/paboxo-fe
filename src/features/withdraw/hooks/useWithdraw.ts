/**
 * Withdraw (U12, R21). Withdraw collateral or redeem supply liquidity; funds
 * always go to the owner. Withdrawing collateral re-checks health via pre-flight
 * (an approximate post-withdraw borrowing-power estimate in preview; the real
 * contract enforces it precisely and a revert surfaces through the wrapper).
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { availableLiquidity, currentDebt, toWholeNumber } from '#/lib/math'
import { preflightWithdraw, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useWithdraw(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const withdrawCollateral = useCallback(
    async (amount: bigint, to?: Address) => {
      const recipient = to ?? address
      if (!recipient || !address) return
      const { chain } = getAdapters()
      const [totals, maxBorrow, borrowShares, collateralValue, price] =
        await Promise.all([
          chain.getMarketTotals(market.poolAddress),
          chain.getMaxBorrowAmount(market.poolAddress, address),
          chain.getUserBorrowShares(market.poolAddress, address),
          chain.getCollateralValue(market.poolAddress, address),
          chain.getPrice(market.collateralAddress),
        ])

      // Estimate borrowing power after the withdrawal shrinks the collateral.
      const priceUsd = toWholeNumber(price.price, 8)
      const collateralUsd = toWholeNumber(collateralValue, 6)
      const withdrawUsd =
        toWholeNumber(amount, market.collateralDecimals) * priceUsd
      const remainingRatio =
        collateralUsd > 0
          ? Math.max(0, (collateralUsd - withdrawUsd) / collateralUsd)
          : 0
      const maxBorrowAfter = BigInt(
        Math.round(Number(maxBorrow) * remainingRatio),
      )

      await write.run({
        preflight: preflightWithdraw({
          amount,
          currentDebt: currentDebt(
            borrowShares,
            totals.totalBorrowAssets,
            totals.totalBorrowShares,
          ),
          maxBorrowAfterWithdraw: maxBorrowAfter,
          priceUpdatedAt: price.updatedAt,
          nowSeconds: unixNow(),
        }),
        send: () =>
          chain.withdrawCollateral(market.poolAddress, amount, recipient),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [
      address,
      market.poolAddress,
      market.collateralAddress,
      market.collateralDecimals,
      write,
    ],
  )

  const withdrawLiquidity = useCallback(
    async (shares: bigint, to?: Address) => {
      const recipient = to ?? address
      if (!recipient) return
      const { chain } = getAdapters()
      const totals = await chain.getMarketTotals(market.poolAddress)
      const available = availableLiquidity(
        totals.totalSupplyAssets,
        totals.totalBorrowAssets,
      )
      await write.run({
        preflight:
          shares > 0n
            ? available > 0n
              ? { enabled: true }
              : {
                  enabled: false,
                  reason: 'No liquidity available to withdraw right now.',
                }
            : { enabled: false, reason: 'Enter an amount greater than zero.' },
        send: () =>
          chain.withdrawLiquidity(market.poolAddress, shares, recipient),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market.poolAddress, write],
  )

  return { ...write, withdrawCollateral, withdrawLiquidity }
}
