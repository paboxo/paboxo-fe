/**
 * Borrow & withdraw delegation (U14, R23). Grant/revoke another address the
 * right to borrow against your collateral (debt stays yours) or trigger your
 * withdrawals (funds still return to you). Reads current allowances back.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import type { MarketView } from '#/features/markets/types'

export function useDelegation(market: MarketView) {
  const write = useWriteAction()

  const grantBorrow = useCallback(
    (delegate: Address, amount: bigint) =>
      write.run({
        send: () =>
          getAdapters().chain.approveBorrowDelegation(
            market.poolAddress,
            delegate,
            amount,
          ),
        invalidateKeys: [['delegation', market.poolAddress]],
      }),
    [market.poolAddress, write],
  )

  /** Revoke by granting a zero cap. */
  const revokeBorrow = useCallback(
    (delegate: Address) => grantBorrow(delegate, 0n),
    [grantBorrow],
  )

  const grantWithdraw = useCallback(
    (delegate: Address, allowed: boolean) =>
      write.run({
        send: () =>
          getAdapters().chain.approveWithdrawDelegation(
            market.poolAddress,
            delegate,
            allowed,
          ),
        invalidateKeys: [['delegation', market.poolAddress]],
      }),
    [market.poolAddress, write],
  )

  return { ...write, grantBorrow, revokeBorrow, grantWithdraw }
}

/** Read a delegate's current borrow allowance + withdraw permission from you. */
export function useDelegationStatus(market: MarketView, delegate?: Address) {
  const { address } = useAccount()
  const query = useQuery({
    queryKey: ['delegation', market.poolAddress, address, delegate],
    enabled: Boolean(address && delegate),
    queryFn: async () => {
      const { chain } = getAdapters()
      if (!address || !delegate) return { borrow: 0n, withdraw: false }
      const [borrow, withdraw] = await Promise.all([
        chain.getBorrowDelegation(market.poolAddress, address, delegate),
        chain.getWithdrawDelegation(market.poolAddress, address, delegate),
      ])
      return { borrow, withdraw }
    },
  })
  return {
    borrow: query.data?.borrow ?? 0n,
    withdraw: query.data?.withdraw ?? false,
    isLoading: query.isLoading,
  }
}
