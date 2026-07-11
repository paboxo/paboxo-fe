/**
 * Repay (U12, R20). One entry point, three on-chain shapes of
 * `repayWithSelectedToken` — selected by the chosen pay token:
 *
 *  - **Path A — borrow token from wallet:** `token = borrowToken`,
 *    `fromPosition: false`, `fee: 0`, no swap. Exact-amount approval with a small
 *    interest-drift buffer.
 *  - **Path B — another wallet token (swapped):** `token = <wallet token>`,
 *    `fromPosition: false`, `fee: SWAP_FEE_TIER`. The entered amount is USD-
 *    normalized to a borrow-token amount, then to live debt shares; the pool pulls
 *    the token from the wallet and swaps it. Needs an exact-amount approval.
 *  - **Path C — sell position collateral:** `token = collateral`,
 *    `fromPosition: true`, `fee: SWAP_FEE_TIER`. The pool sells the borrower's own
 *    collateral — no wallet funds, no approval.
 *
 * `amountOutMinimum` is 0 on the swap paths: the pool floors the swap output at the
 * borrow amount itself (LendingPool `_repayWithSelectedTokenTransfer`); a non-zero
 * value here caps the swap input and reverts InsufficientBalance.
 *
 * Note (contract): paths B and C can still revert on-chain until the contract's
 * collateral-needed math buffers for the DEX fee — B mis-scales
 * `_calculateCollateralNeeded` (InsufficientBalance), and C's swap output can fall
 * a hair under the debt (InsufficientOutputAmount). The frontend call is correct.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { debtSharesForAssets } from '#/lib/math'
import { preflightRepay } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

/** DEX fee tier for the swap-repay paths (B and C) — 1000 (0.1%), the tier
 *  paboxo's pools are deployed at (same as the swap panel). Unused on path A. */
const SWAP_FEE_TIER = 1000

/** Oracle price decimals (8dp USD), matching the chain adapter / price hooks. */
const PRICE_DECIMALS = 8

/** A pay token for repay. `isCollateral` selects path C (`fromPosition: true`,
 *  sold from the position); otherwise the token is charged to the wallet. */
export interface RepayToken {
  address: Address
  decimals: number
  isCollateral: boolean
}

export function useRepay(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const repay = useCallback(
    /**
     * @param assets  Amount in the pay token's own units (path A/B: the wallet
     *   token; path C: the collateral). Converted to live debt shares.
     * @param token   Pay token; defaults to the borrow token (path A).
     */
    async (assets: bigint, token?: RepayToken, user?: Address) => {
      const target = user ?? address
      if (!target) return
      const { chain } = getAdapters()
      const totals = await chain.getMarketTotals(market.poolAddress)

      const repayToken: RepayToken = token ?? {
        address: market.borrowAddress,
        decimals: market.borrowDecimals,
        isCollateral: false,
      }
      const isBorrowToken =
        repayToken.address.toLowerCase() === market.borrowAddress.toLowerCase()

      if (isBorrowToken) {
        // Path A: pay the borrow token directly — no swap.
        const shares = debtSharesForAssets(
          assets,
          totals.totalBorrowAssets,
          totals.totalBorrowShares,
        )
        // The pool pulls sharesToAssets(shares) at *execution* time, which drifts
        // a few units above the entered `assets` as interest accrues between this
        // read and the mined tx — a repay reverted ERC20InsufficientAllowance
        // (needed 10,000,003 vs approved 10,000,000). Approve a small buffer above
        // `assets` (0.1% + 1 unit) so that drift never leaves the allowance short.
        const approvalAmount = assets + assets / 1000n + 1n
        await write.run({
          approval: {
            token: market.borrowAddress,
            spender: market.poolAddress,
            amount: approvalAmount,
          },
          preflight: preflightRepay({ amount: assets, shares }),
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
        return
      }

      // Paths B/C (swap): USD-normalize the entered amount to a borrow-token
      // amount, then to live debt shares (senja parity).
      const [tokenPrice, borrowPrice] = await Promise.all([
        chain.getPrice(repayToken.address),
        chain.getPrice(market.borrowAddress),
      ])
      const inputUsd =
        Number(formatUnits(assets, repayToken.decimals)) *
        Number(formatUnits(tokenPrice.price, PRICE_DECIMALS))
      const borrowPriceUsd = Number(
        formatUnits(borrowPrice.price, PRICE_DECIMALS),
      )
      const borrowTokens = borrowPriceUsd > 0 ? inputUsd / borrowPriceUsd : 0
      const borrowAmount = parseUnits(
        borrowTokens.toFixed(market.borrowDecimals),
        market.borrowDecimals,
      )
      const shares = debtSharesForAssets(
        borrowAmount,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      )

      await write.run({
        // Path C (collateral) is sold from the position — no wallet approval.
        // Path B (another wallet token) needs an exact-amount approval.
        approval: repayToken.isCollateral
          ? undefined
          : {
              token: repayToken.address,
              spender: market.poolAddress,
              amount: assets,
            },
        preflight: preflightRepay({ amount: borrowAmount, shares }),
        send: () =>
          chain.repayWithSelectedToken(market.poolAddress, {
            user: target,
            token: repayToken.address,
            shares,
            amountOutMinimum: 0n,
            fromPosition: repayToken.isCollateral,
            fee: SWAP_FEE_TIER,
          }),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market, write],
  )

  return { ...write, repay }
}
