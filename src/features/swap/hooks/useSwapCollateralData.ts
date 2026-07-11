/**
 * Data for the swap-collateral panel (senja `trade-collateral` model). The
 * "Sell" side is the collateral the user holds INSIDE a pool position — read
 * against the position address, not the wallet — and it is flexible: a position
 * can hold several token forms after prior swaps. Output + rate come from the
 * oracle prices, mirroring senja's estimatedOutput.
 */
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { zeroAddress } from 'viem'
import { TOKENS, TOKEN_SYMBOLS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { TokenBalances } from '#/features/shared/useTokenBalances'
import { estimateAmountOut } from './useSwapCollateral'

/** The connected user's position address for a pool (undefined when none). */
export function usePositionAddress(pool: Address): Address | undefined {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['position-address', pool, address],
    enabled: Boolean(address),
    queryFn: () =>
      getAdapters().chain.getPositionAddress(pool, address as Address),
  })
  return query.data && query.data !== zeroAddress ? query.data : undefined
}

/**
 * Per-token balances the user holds inside the pool position — their collateral,
 * in whatever token form. Read against the position address, so this is the
 * amount available to swap, not the wallet balance.
 */
export function usePositionBalances(pool: Address): {
  balances: TokenBalances
  positionAddr: Address | undefined
  isLoading: boolean
} {
  const positionAddr = usePositionAddress(pool)
  const query = useQuery({
    queryKey: ['position-balances', pool, positionAddr],
    enabled: Boolean(positionAddr),
    queryFn: async (): Promise<TokenBalances> => {
      const { chain } = getAdapters()
      // allSettled so one failing token read doesn't zero every balance.
      const settled = await Promise.allSettled(
        TOKEN_SYMBOLS.map((symbol) =>
          chain.getTokenBalance(TOKENS[symbol].address, positionAddr as Address),
        ),
      )
      const balances: TokenBalances = {}
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          balances[TOKEN_SYMBOLS[index]] = result.value
        }
      })
      return balances
    },
  })
  return {
    balances: query.data ?? {},
    positionAddr,
    isLoading: query.isLoading,
  }
}

/**
 * Live swap quote from the oracle: the estimated output (senja `estimatedOutput`)
 * and the display rate (`1 tokenIn = rate tokenOut`). Prices are cached per pair;
 * the output is recomputed from `amountIn` on the client.
 */
export function useSwapQuote(
  tokenIn: Address,
  decimalsIn: number,
  tokenOut: Address,
  decimalsOut: number,
  amountIn: bigint,
): { estimatedOut: bigint; rate: number } {
  const query = useQuery({
    queryKey: ['swap-quote', tokenIn, tokenOut],
    queryFn: async () => {
      const { chain } = getAdapters()
      const [priceIn, priceOut] = await Promise.all([
        chain.getPrice(tokenIn),
        chain.getPrice(tokenOut),
      ])
      return { priceIn: priceIn.price, priceOut: priceOut.price }
    },
  })
  const priceIn = query.data?.priceIn ?? 0n
  const priceOut = query.data?.priceOut ?? 0n
  const estimatedOut =
    amountIn > 0n
      ? estimateAmountOut(amountIn, priceIn, priceOut, decimalsIn, decimalsOut)
      : 0n
  // Both feeds are 8-dp USD, so the ratio is unit-free.
  const rate = priceOut > 0n ? Number(priceIn) / Number(priceOut) : 0
  return { estimatedOut, rate }
}
