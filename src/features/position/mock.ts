import type { MockQuery } from '#/features/markets/mock'

export interface SupplyRow {
  symbol: string
  balance: bigint
  decimals: number
  valueUsd: number
  apy: number
}

export interface BorrowRow {
  symbol: string
  debt: bigint
  decimals: number
  valueUsd: number
  apr: number
}

export interface PositionView {
  netWorthUsd: number
  netApy: number
  healthFactor: number
  liquidationAsset?: string
  currentPrice?: number
  liquidationPrice?: number
  supplies: SupplyRow[]
  borrows: BorrowRow[]
}

/** Placeholder position (U12). The integration plan's `usePosition` replaces this. */
export const MOCK_POSITION: PositionView = {
  // pxWHSK priced at the real deploy seed ($0.05); values below are coherent with it.
  netWorthUsd: 9_758,
  netApy: 4.12,
  healthFactor: 2.41,
  liquidationAsset: 'pxWHSK',
  currentPrice: 0.05,
  liquidationPrice: 0.039,
  supplies: [
    {
      symbol: 'pxUSDT',
      balance: 12_500_000_000n,
      decimals: 6,
      valueUsd: 12_500,
      apy: 5.24,
    },
    {
      symbol: 'pxWHSK',
      balance: 8_200_000_000_000_000_000_000n,
      decimals: 18,
      valueUsd: 410,
      apy: 0,
    },
  ],
  borrows: [
    {
      symbol: 'pxUSDT',
      debt: 3_152_000_000n,
      decimals: 6,
      valueUsd: 3_152,
      apr: 7.8,
    },
  ],
}

/** Pass `empty` to preview the new-user state. */
export function usePosition(empty = false): MockQuery<PositionView | null> {
  return { data: empty ? null : MOCK_POSITION, isLoading: false, error: null }
}
