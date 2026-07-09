/**
 * Wallet balance per known token for the connected user, via the chain adapter
 * (mock now, live later). Powers the token picker's per-row balances — read
 * through the seam so the mock→live swap needs no change here (R2).
 */
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { TOKENS } from '#/lib/contracts'
import type { Address, TokenSymbol } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'

export type TokenBalances = Partial<Record<TokenSymbol, bigint>>

const SYMBOLS = Object.keys(TOKENS) as TokenSymbol[]

export function useTokenBalances(): {
  balances: TokenBalances
  isLoading: boolean
} {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['token-balances', address],
    enabled: Boolean(address),
    queryFn: async (): Promise<TokenBalances> => {
      const { chain } = getAdapters()
      const owner = address as `0x${string}`
      const entries = await Promise.all(
        SYMBOLS.map(
          async (symbol) =>
            [
              symbol,
              await chain.getTokenBalance(TOKENS[symbol].address, owner),
            ] as const,
        ),
      )
      return Object.fromEntries(entries)
    },
  })
  return { balances: query.data ?? {}, isLoading: query.isLoading }
}

/**
 * Wallet balance for one token, keyed by its **address** — use this when a token
 * is identified by address rather than a canonical symbol (e.g. a market's
 * collateral, where the cross-chain pxWHSK shares the symbol but has a distinct
 * address). Returns `undefined` until loaded or when there is no token/wallet.
 */
export function useTokenBalance(token: Address | undefined): {
  balance: bigint | undefined
  isLoading: boolean
} {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['token-balance', token, address],
    enabled: Boolean(address && token),
    queryFn: async (): Promise<bigint> => {
      const { chain } = getAdapters()
      return chain.getTokenBalance(token as Address, address as `0x${string}`)
    },
  })
  return { balance: query.data, isLoading: query.isLoading }
}
