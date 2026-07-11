/**
 * Repay (U12, R20). One entry point over `repayWithSelectedToken`. Two orthogonal
 * choices: the pay `token` (any token) and where it comes from (`fromPosition`).
 *
 *  - **token = borrow token:** paid directly, no swap, `fee: 0`.
 *  - **token = anything else:** the entered amount is USD-normalized to a borrow
 *    amount, then to live debt shares; the pool swaps the token, `fee: SWAP_FEE_TIER`.
 *
 *  - **fromPosition = false (wallet):** the token is charged to the wallet and
 *    needs an exact-amount approval.
 *  - **fromPosition = true (position):** the token is taken from the user's own
 *    position holdings and swapped/applied there — no wallet funds, no approval.
 *    The position can hold any token (the user can swap collateral inside it), so
 *    this is not limited to the market's original collateral asset.
 *
 * `amountOutMinimum` is 0 on the swap paths: the pool floors the swap output at the
 * borrow amount itself (LendingPool `_repayWithSelectedTokenTransfer`); a non-zero
 * value here caps the swap input and reverts InsufficientBalance.
 *
 * Note (contract): the swap paths can still revert on-chain until the contract's
 * collateral-needed math buffers for the DEX fee — a wallet swap mis-scales
 * `_calculateCollateralNeeded` (InsufficientBalance), and a position swap's output
 * can fall a hair under the debt (InsufficientOutputAmount). The frontend call is
 * correct.
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

/** DEX fee tier for the swap-repay paths — 1000 (0.1%), the tier paboxo's pools
 *  are deployed at (same as the swap panel). Unused when paying the borrow token. */
const SWAP_FEE_TIER = 1000

/** Oracle price decimals (8dp USD), matching the chain adapter / price hooks. */
const PRICE_DECIMALS = 8

/** A pay token for repay. `fromPosition` selects the source: the user's position
 *  holdings (sold there, no approval) when true, otherwise the wallet. */
export interface RepayToken {
  address: Address
  decimals: number
  fromPosition: boolean
}

export function useRepay(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const repay = useCallback(
    /**
     * @param assets  Amount in the pay token's own units. Converted to live debt
     *   shares (directly for the borrow token, via oracle prices otherwise).
     * @param token   Pay token + source; defaults to the borrow token from wallet.
     */
    async (assets: bigint, token?: RepayToken, user?: Address) => {
      const target = user ?? address
      if (!target) return
      const { chain } = getAdapters()
      const totals = await chain.getMarketTotals(market.poolAddress)

      const repayToken: RepayToken = token ?? {
        address: market.borrowAddress,
        decimals: market.borrowDecimals,
        fromPosition: false,
      }
      const isBorrowToken =
        repayToken.address.toLowerCase() === market.borrowAddress.toLowerCase()

      if (isBorrowToken) {
        // Borrow token: applied directly, no swap.
        const shares = debtSharesForAssets(
          assets,
          totals.totalBorrowAssets,
          totals.totalBorrowShares,
        )
        // From the wallet the pool pulls sharesToAssets(shares) at *execution*
        // time, which drifts a few units above the entered `assets` as interest
        // accrues before the tx mines (a repay reverted ERC20InsufficientAllowance:
        // needed 10,000,003 vs approved 10,000,000). Approve a small buffer
        // (0.1% + 1) so that drift never leaves the allowance short. From the
        // position there is no wallet approval at all.
        await write.run({
          approval: repayToken.fromPosition
            ? undefined
            : {
                token: market.borrowAddress,
                spender: market.poolAddress,
                amount: assets + assets / 1000n + 1n,
              },
          preflight: preflightRepay({ amount: assets, shares }),
          send: () =>
            chain.repayWithSelectedToken(market.poolAddress, {
              user: target,
              token: market.borrowAddress,
              shares,
              amountOutMinimum: 0n,
              fromPosition: repayToken.fromPosition,
              fee: 0,
            }),
          invalidateKeys: WRITE_INVALIDATE_KEYS,
        })
        return
      }

      // Swap path (any non-borrow token): USD-normalize the entered amount to a
      // borrow-token amount, then to live debt shares (senja parity).
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
        // From the position the token is already there — no wallet approval. From
        // the wallet the pool pulls it, so approve the exact amount.
        approval: repayToken.fromPosition
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
            fromPosition: repayToken.fromPosition,
            fee: SWAP_FEE_TIER,
          }),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [address, market, write],
  )

  return { ...write, repay }
}
