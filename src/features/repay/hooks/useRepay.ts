/**
 * Repay (U12, R20). Three sources, all through `repayWithSelectedToken`:
 *  - the borrow token (pxUSDT) directly from the wallet — mode A, no swap;
 *  - the user's position collateral — the pool swaps it (fromPosition);
 *  - another wallet token (e.g. WETH) — approved, then swapped on-chain.
 *
 * The entered amount is converted to live debt shares so accrued interest is
 * covered (senja `useBorrowActions.ts:444-470`). Swap paths mirror senja's args
 * exactly: fee tier 3000 and `amountOutMinimum` = 0 (the pool prices the swap; a
 * non-zero value caps the swap input and reverts InsufficientBalance).
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

/** Oracle price decimals (matches the chain adapter / position hooks). */
const PRICE_DECIMALS = 8
/** DEX fee tier for swap-repay paths — 3000, matching senja's working
 *  `repayWithSelectedToken` call (`useBorrowActions.ts:514`). */
const SWAP_FEE_TIER = 3000

export interface RepayToken {
  address: Address
  decimals: number
  /** Pay by selling the user's position collateral rather than a wallet token. */
  isCollateral: boolean
}

export function useRepay(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const repay = useCallback(
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
        // Mode A: pay the borrow token directly — no swap.
        const shares = debtSharesForAssets(
          assets,
          totals.totalBorrowAssets,
          totals.totalBorrowShares,
        )
        // The pool pulls sharesToAssets(shares) at *execution* time, which drifts
        // a few units above the entered `assets` as interest accrues between this
        // read and the mined tx — a repay reverted with ERC20InsufficientAllowance
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
              fee: SWAP_FEE_TIER,
            }),
          invalidateKeys: WRITE_INVALIDATE_KEYS,
        })
        return
      }

      // Swap path (collateral or another wallet token): USD-normalize the entered
      // amount to a borrow-token amount, then to live debt shares (senja parity).
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
      // senja parity (`useBorrowActions.ts:508-516`): shares from the full
      // borrow-equivalent, `amountOutMinimum` = 0 (the pool prices the swap; a
      // non-zero value here caps the swap input and reverts InsufficientBalance),
      // fee tier 3000.
      const shares = debtSharesForAssets(
        borrowAmount,
        totals.totalBorrowAssets,
        totals.totalBorrowShares,
      )

      await write.run({
        // Collateral is pulled from the position (no wallet approval); another
        // wallet token needs an exact-amount approval in its own decimals.
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
