/**
 * Swap collateral (Swap page). Trade the tokens held inside a position via the
 * DEX — `swapTokenByPosition` on the LendingPool. No wallet approval: the input
 * token is already in the position. `amountOutMinimum` is derived from the oracle
 * prices and a slippage tolerance and is NEVER 0 (a 0 floor fills at any price);
 * the pre-flight gate enforces that.
 */
import { useCallback } from 'react'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { pow10 } from '#/lib/math'
import { preflightSwap, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'

/** DEX fee tier — 1000 = 0.1% (from the SC integration docs). */
export const SWAP_FEE_TIER = 1000

export interface SwapInput {
  pool: Address
  tokenIn: Address
  tokenInDecimals: number
  tokenOut: Address
  tokenOutDecimals: number
  amountIn: bigint
  /** Slippage tolerance in percent (e.g. 0.5 = 0.5%). */
  slippagePct: number
}

/** Expected output from oracle prices (both feeds 8-dp USD), scaled to tokenOut. */
export function estimateAmountOut(
  amountIn: bigint,
  priceIn: bigint,
  priceOut: bigint,
  decimalsIn: number,
  decimalsOut: number,
): bigint {
  if (priceOut === 0n) return 0n
  // amountIn * priceIn / priceOut, rescaled from tokenIn to tokenOut decimals.
  const numerator = amountIn * priceIn * pow10(decimalsOut)
  return numerator / (priceOut * pow10(decimalsIn))
}

export function useSwapCollateral(pool: Address) {
  const write = useWriteAction()

  const swap = useCallback(
    async (input: SwapInput) => {
      const { chain } = getAdapters()
      const [priceIn, priceOut] = await Promise.all([
        chain.getPrice(input.tokenIn),
        chain.getPrice(input.tokenOut),
      ])

      await write.run({
        preflight: preflightSwap({
          amountIn: input.amountIn,
          priceUpdatedAt: Math.min(priceIn.updatedAt, priceOut.updatedAt),
          nowSeconds: unixNow(),
        }),
        // amountOutMinimum: 0n — the pool prices the swap (senja parity). An
        // oracle-derived floor rejected real fills when the feed diverged from
        // the pool ("too little received" revert).
        send: () =>
          chain.swapCollateral(pool, {
            tokenIn: input.tokenIn,
            tokenOut: input.tokenOut,
            amountIn: input.amountIn,
            amountOutMinimum: 0n,
            fee: SWAP_FEE_TIER,
          }),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
    },
    [pool, write],
  )

  return { ...write, swap }
}
