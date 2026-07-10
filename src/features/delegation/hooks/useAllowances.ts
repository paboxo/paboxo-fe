/**
 * ERC20 allowance management (U14, R30). Lists the user's standing token
 * allowances to a market's pool and revokes them (approve 0) — this is where a
 * post-liquidation over-approval gets reset if one lingers.
 */
import { useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { TOKENS } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import type { MarketView } from '#/features/markets/types'

export interface AllowanceEntry {
  token: Address
  symbol: string
  decimals: number
  allowance: bigint
}

async function loadAllowances(
  market: MarketView,
  owner: Address,
): Promise<AllowanceEntry[]> {
  const { chain } = getAdapters()
  const tokens: Omit<AllowanceEntry, 'allowance'>[] = [
    {
      token: TOKENS.pxUSDT.address,
      symbol: 'pxUSDT',
      decimals: TOKENS.pxUSDT.decimals,
    },
    {
      token: market.collateralAddress,
      symbol: market.collateralSymbol,
      decimals: market.collateralDecimals,
    },
  ]
  const entries = await Promise.all(
    tokens.map(async (info) => ({
      ...info,
      allowance: await chain.getAllowance(
        info.token,
        owner,
        market.poolAddress,
      ),
    })),
  )
  return entries.filter((entry) => entry.allowance > 0n)
}

export function useAllowances(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()

  const query = useQuery({
    queryKey: ['allowances', market.poolAddress, address],
    enabled: Boolean(address),
    queryFn: () =>
      address ? loadAllowances(market, address) : Promise.resolve([]),
  })

  const revoke = useCallback(
    (token: Address) =>
      write.run({
        send: () => getAdapters().chain.approve(token, market.poolAddress, 0n),
        invalidateKeys: [['allowances', market.poolAddress, address]],
      }),
    [address, market.poolAddress, write],
  )

  return {
    allowances: query.data ?? [],
    isLoading: query.isLoading,
    state: write.state,
    revoke,
  }
}
