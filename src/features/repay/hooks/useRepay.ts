/**
 * Repay mode A (U12, R20). Pay the borrow token (pxUSDT) directly from the
 * wallet. The user enters an asset amount; it is converted to live debt shares
 * (Appendix) so interest accrued since the last read is covered, then an exact
 * approval to the pool precedes repayWithSelectedToken in mode A (fee 0).
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { debtSharesForAssets } from '#/lib/math'
import { preflightRepay } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

export function useRepay(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const repay = useCallback(
    async (assets: bigint, user?: Address) => {
      const target = user ?? address
      if (!target) return
      const { chain } = getAdapters()
      const totals = await chain.getMarketTotals(market.poolAddress)
      const shares = debtSharesForAssets(
        assets,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      )
      await write.run({
        approval: {
          token: TOKENS.pxUSDT.address,
          spender: market.poolAddress,
          amount: assets,
        },
        preflight: preflightRepay({ amount: assets, shares }),
        send: () =>
          chain.repayWithSelectedToken(market.poolAddress, {
            user: target,
            token: TOKENS.pxUSDT.address,
            shares,
            amountOutMinimum: 0n,
            fromPosition: false,
            fee: 0,
          }),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market.poolAddress, write],
  )

  return { ...write, repay }
}
