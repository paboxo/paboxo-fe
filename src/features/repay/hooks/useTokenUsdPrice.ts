/**
 * The oracle USD price (a plain number) for an arbitrary token, read through the
 * chain adapter. Used by the repay panel to show an exchange rate for a pay-token
 * whose price isn't already on the market view (e.g. repaying with pxWETH), so
 * the user can size how much to repay.
 */
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'

/** Oracle price decimals (8dp USD), matching the chain adapter / position hooks. */
const PRICE_DECIMALS = 8

export function useTokenUsdPrice(token: Address | undefined): {
  priceUsd: number | undefined
  isLoading: boolean
} {
  const query = useQuery({
    queryKey: ['token-usd-price', token],
    enabled: Boolean(token),
    queryFn: async (): Promise<number | undefined> => {
      const { chain } = getAdapters()
      const { price } = await chain.getPrice(token as Address)
      return price > 0n ? Number(price) / 10 ** PRICE_DECIMALS : undefined
    },
  })
  return { priceUsd: query.data, isLoading: query.isLoading }
}
