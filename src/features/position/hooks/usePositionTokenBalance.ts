/**
 * A user's position reads for a pool: the position address, and the balance of a
 * token held INSIDE the position (their collateral, in whatever token form).
 * Shared by the swap panel and the withdraw panel.
 */
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { zeroAddress } from 'viem'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'

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

/** Balance of `token` held inside the pool position (0 until loaded / no position). */
export function usePositionTokenBalance(
  pool: Address,
  token: Address | undefined,
): { balance: bigint | undefined; isLoading: boolean } {
  const positionAddr = usePositionAddress(pool)
  const query = useQuery({
    queryKey: ['position-token-balance', pool, token, positionAddr],
    enabled: Boolean(positionAddr && token),
    queryFn: () =>
      getAdapters().chain.getTokenBalance(
        token as Address,
        positionAddr as Address,
      ),
  })
  return { balance: query.data, isLoading: query.isLoading }
}
