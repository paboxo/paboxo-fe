/**
 * Liquidation (U13, R22). Repay an unhealthy borrower's debt and seize their
 * collateral (+ bonus). The debt is sized from live borrow shares (Appendix),
 * the borrow token is slightly over-approved to absorb interest between read and
 * send, and the residual over-approval is reset to 0 after a successful seize
 * (AE4, R30).
 */
import { useCallback } from 'react'
import { TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { currentDebt } from '#/lib/math'
import { preflightLiquidate, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useLiquidate(market: MarketView) {
  const write = useWriteAction()

  const liquidate = useCallback(
    async (borrower: Address) => {
      const { chain } = getAdapters()
      const [status, totals, borrowShares, price] = await Promise.all([
        chain.checkLiquidatable(market.poolAddress, borrower),
        chain.getMarketTotals(market.poolAddress),
        chain.getUserBorrowShares(market.poolAddress, borrower),
        chain.getPrice(market.collateralAddress),
      ])

      const debtAssets = currentDebt(
        borrowShares,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      )
      // Over-approve ~1% so interest accrued before the tx lands is still covered.
      const overApproval = (debtAssets * 101n) / 100n

      const confirmed = await write.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: market.poolAddress,
          amount: overApproval,
        },
        preflight: preflightLiquidate({
          liquidatable: status.liquidatable,
          priceUpdatedAt: price.updatedAt,
          nowSeconds: unixNow(),
        }),
        send: () => chain.liquidation(market.poolAddress, [borrower]),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })

      // Reset the residual over-approval only on a successful seize.
      if (confirmed) {
        await chain.approve(TOKENS.pxUSDT.address, market.poolAddress, 0n)
      }
    },
    [market.poolAddress, market.collateralAddress, write],
  )

  return { ...write, liquidate }
}
