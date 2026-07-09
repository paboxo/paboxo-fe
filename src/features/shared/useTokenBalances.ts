/**
 * Wallet balance per known token for the connected user, via the chain adapter
 * (mock now, live later). Powers the token picker's per-row balances — read
 * through the seam so the mock→live swap needs no change here (R2).
 */
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { TOKENS, TOKEN_SYMBOLS } from '#/lib/contracts'
import type { Address, TokenSymbol } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'

export type TokenBalances = Partial<Record<TokenSymbol, bigint>>

export function useTokenBalances(): {
  balances: TokenBalances
  isLoading: boolean
  isError: boolean
} {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['token-balances', address],
    enabled: Boolean(address),
    queryFn: async (): Promise<TokenBalances> => {
      const { chain } = getAdapters()
      const owner = address as Address
      // allSettled so one failing token read doesn't zero every balance — a
      // rejected read is simply omitted (rendered as unavailable), not shown as 0.
      const settled = await Promise.allSettled(
        TOKEN_SYMBOLS.map((symbol) =>
          chain.getTokenBalance(TOKENS[symbol].address, owner),
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
    isLoading: query.isLoading,
    isError: query.isError,
  }
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
  isError: boolean
} {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['token-balance', token, address],
    enabled: Boolean(address && token),
    queryFn: async (): Promise<bigint> => {
      const { chain } = getAdapters()
      return chain.getTokenBalance(token as Address, address as Address)
    },
  })
  return {
    balance: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
