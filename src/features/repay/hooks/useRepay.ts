/**
 * Repay (U12, R20). The entered amount is always the debt to clear, denominated
 * in the borrow token (pxUSDT), converted to live debt shares so accrued interest
 * is covered. Two on-chain paths, both `repayWithSelectedToken`:
 *
 *  - **Path A — pay from wallet:** `token = borrowToken`, `fromPosition: false`,
 *    no swap. The wallet is charged the borrow token directly (needs an approval).
 *  - **Path C — pay from collateral:** `token = collateral`, `fromPosition: true`.
 *    The pool sells the borrower's own position collateral to cover the debt — no
 *    wallet funds and no approval. `amountOutMinimum` = 0 (the pool floors the
 *    swap output at the debt itself, see LendingPool `_repayWithSelectedTokenTransfer`).
 *
 * Repaying with an arbitrary third token is intentionally NOT supported: the
 * contract only swaps the position's own collateral (Position.sol), so the panel
 * offers just the two sources above.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { debtSharesForAssets } from '#/lib/math'
import { preflightRepay } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

/** DEX fee tier for the collateral swap-repay — 1000 (0.1%), the tier paboxo's
 *  pools are deployed at (same as the swap panel). Only used on path C. */
const SWAP_FEE_TIER = 1000

export function useRepay(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const repay = useCallback(
    /**
     * @param debtAssets  Debt to clear, in the borrow token (pxUSDT, 6dp).
     * @param fromCollateral  Path C when true (sell collateral); path A otherwise.
     */
    async (debtAssets: bigint, fromCollateral = false, user?: Address) => {
      const target = user ?? address
      if (!target) return
      const { chain } = getAdapters()
      const totals = await chain.getMarketTotals(market.poolAddress)
      const shares = debtSharesForAssets(
        debtAssets,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      )

      if (fromCollateral) {
        // Path C: sell the position's collateral — no wallet funds, no approval.
        await write.run({
          preflight: preflightRepay({ amount: debtAssets, shares }),
          send: () =>
            chain.repayWithSelectedToken(market.poolAddress, {
              user: target,
              token: market.collateralAddress,
              shares,
              amountOutMinimum: 0n,
              fromPosition: true,
              fee: SWAP_FEE_TIER,
            }),
          invalidateKeys: WRITE_INVALIDATE_KEYS,
        })
        return
      }

      // Path A: pay the borrow token directly from the wallet. The pool pulls
      // sharesToAssets(shares) at execution, which drifts a few units above
      // `debtAssets` as interest accrues before the tx mines (a repay reverted
      // ERC20InsufficientAllowance: needed 10,000,003 vs 10,000,000). Approve a
      // small buffer (0.1% + 1) so that drift never leaves the allowance short.
      const approvalAmount = debtAssets + debtAssets / 1000n + 1n
      await write.run({
        approval: {
          token: market.borrowAddress,
          spender: market.poolAddress,
          amount: approvalAmount,
        },
        preflight: preflightRepay({ amount: debtAssets, shares }),
        send: () =>
          chain.repayWithSelectedToken(market.poolAddress, {
            user: target,
            token: market.borrowAddress,
            shares,
            amountOutMinimum: 0n,
            fromPosition: false,
            fee: 0,
          }),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market, write],
  )

  return { ...write, repay }
}
