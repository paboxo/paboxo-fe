/**
 * Position read hook (U6). Builds the connected user's cross-market position
 * from the chain adapter's live reads (supply shares → value, collateral, borrow
 * shares → debt via the Appendix formula, health, max-borrow) using src/lib/math.
 * Mock mode serves fixtures; live (U18) passes the real wallet address unchanged.
 */
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { MARKETS, TOKENS, getMarketConfig } from '#/lib/contracts'
import type { Address, MarketConfig } from '#/lib/contracts'
import { getAdapters } from '#/lib/data'
import type { ChainAdapter } from '#/lib/data'
import {
  WAD,
  currentDebt,
  supplyRateWad,
  supplyValue,
  toWholeNumber,
  utilizationWad,
  wadToPercent,
} from '#/lib/math'
import type { QueryResult } from '#/features/shared/query'
import { PREVIEW_ADDRESS } from '#/features/shared/preview'
import type { BorrowRow, PositionView, SupplyRow } from '../types'

const BORROW_DECIMALS = TOKENS.pxUSDT.decimals

export interface MarketPosition {
  supplies: SupplyRow[]
  borrows: BorrowRow[]
  healthFactor?: number
  liquidation?: {
    asset: string
    currentPrice: number
    liquidationPrice: number
  }
}

const round2 = (n: number): number => Math.round(n * 100) / 100

async function loadMarketPosition(
  config: MarketConfig,
  address: Address,
  chain: ChainAdapter,
): Promise<MarketPosition> {
  const [
    supplyShares,
    totals,
    collateralValue,
    borrowShares,
    price,
    liq,
    rate,
  ] = await Promise.all([
    chain.getUserSupplyShares(config.pool, address),
    chain.getMarketTotals(config.pool),
    chain.getCollateralValue(config.pool, address),
    chain.getUserBorrowShares(config.pool, address),
    chain.getPrice(config.collateralAddress),
    chain.checkLiquidatable(config.pool, address),
    chain.getBorrowRateWad(config.pool),
  ])

  const priceUsd = toWholeNumber(price.price, 8)
  const utilWad = utilizationWad(
    totals.totalBorrowAssets,
    totals.totalSupplyAssets,
  )
  const reserveWad = (BigInt(config.reserveFactor) * WAD) / 100n
  const supplyApy = wadToPercent(supplyRateWad(rate, utilWad, reserveWad))
  const borrowApr = wadToPercent(rate)

  const supplies: SupplyRow[] = []
  const borrows: BorrowRow[] = []

  // Lender liquidity supply (borrow token).
  const supplied = supplyValue(
    supplyShares,
    totals.totalSupplyAssets,
    totals.totalSupplyShares,
  )
  if (supplied > 0n) {
    supplies.push({
      symbol: config.borrowSymbol,
      balance: supplied,
      decimals: BORROW_DECIMALS,
      valueUsd: toWholeNumber(supplied, BORROW_DECIMALS),
      apy: supplyApy,
    })
  }

  // Collateral supply (collateral token), quantity implied by its USD value.
  const collateralUsd = toWholeNumber(collateralValue, BORROW_DECIMALS)
  if (collateralValue > 0n && priceUsd > 0) {
    const quantity = collateralUsd / priceUsd
    supplies.push({
      symbol: config.collateralSymbol,
      balance: BigInt(Math.round(quantity * 10 ** config.collateralDecimals)),
      decimals: config.collateralDecimals,
      valueUsd: collateralUsd,
      apy: 0,
    })
  }

  // Debt (borrow token).
  const debt = currentDebt(
    borrowShares,
    totals.totalBorrowAssets,
    totals.totalBorrowShares,
  )
  let healthFactor: number | undefined
  let liquidation: MarketPosition['liquidation']
  if (debt > 0n) {
    const debtUsd = toWholeNumber(debt, BORROW_DECIMALS)
    borrows.push({
      symbol: config.borrowSymbol,
      debt,
      decimals: BORROW_DECIMALS,
      valueUsd: debtUsd,
      apr: borrowApr,
    })
    // HF = maxCollateralValue / borrowValue (both 1e18 USD).
    if (liq.borrowValueUsd > 0n) {
      healthFactor =
        Number((liq.maxCollateralValueUsd * 10_000n) / liq.borrowValueUsd) /
        10_000
    }
    // Collateral price at which the position becomes liquidatable.
    if (collateralValue > 0n && priceUsd > 0) {
      const quantity = collateralUsd / priceUsd
      const liquidationPrice =
        quantity > 0 ? debtUsd / (quantity * (config.liqThreshold / 100)) : 0
      liquidation = {
        asset: config.collateralSymbol,
        currentPrice: priceUsd,
        liquidationPrice: Math.round(liquidationPrice * 1e6) / 1e6,
      }
    }
  }

  return { supplies, borrows, healthFactor, liquidation }
}

async function loadPosition(
  address: Address,
  chain: ChainAdapter,
): Promise<PositionView | null> {
  const parts = await Promise.all(
    MARKETS.map((config) => loadMarketPosition(config, address, chain)),
  )
  const supplies = parts.flatMap((part) => part.supplies)
  const borrows = parts.flatMap((part) => part.borrows)
  if (supplies.length === 0 && borrows.length === 0) return null

  const supplyUsd = supplies.reduce((sum, row) => sum + row.valueUsd, 0)
  const borrowUsd = borrows.reduce((sum, row) => sum + row.valueUsd, 0)
  const netWorthUsd = supplyUsd - borrowUsd

  const earn = supplies.reduce((sum, row) => sum + row.valueUsd * row.apy, 0)
  const cost = borrows.reduce((sum, row) => sum + row.valueUsd * row.apr, 0)
  const netApy = netWorthUsd > 0 ? (earn - cost) / netWorthUsd : 0

  const healths = parts
    .map((part) => part.healthFactor)
    .filter((hf): hf is number => hf !== undefined)
  const healthFactor = healths.length > 0 ? Math.min(...healths) : 99
  const liquidation = parts.find((part) => part.liquidation)?.liquidation

  return {
    netWorthUsd: round2(netWorthUsd),
    netApy: round2(netApy),
    healthFactor: round2(healthFactor),
    liquidationAsset: liquidation?.asset,
    currentPrice: liquidation?.currentPrice,
    liquidationPrice: liquidation?.liquidationPrice,
    supplies,
    borrows,
  }
}

export interface UsePositionOptions {
  /** Defaults to a preview address in mock mode. */
  address?: Address
  /** Force the new-user empty state (preview). */
  empty?: boolean
}

export function usePosition(
  options: UsePositionOptions = {},
): QueryResult<PositionView | null> {
  const { address = PREVIEW_ADDRESS, empty = false } = options
  const query = useQuery({
    queryKey: ['position', address, empty],
    queryFn: () =>
      empty
        ? Promise.resolve(null)
        : loadPosition(address, getAdapters().chain),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export interface UseMarketPositionOptions {
  /** Override the read address (defaults to the connected wallet, else preview). */
  address?: Address
  /** Force enable/disable; defaults to reading only once a wallet is connected. */
  enabled?: boolean
}

/**
 * Per-pool position read hook (U6). Exposes a single isolated pool's position
 * (supplied liquidity, collateral, debt, health) by market id, wrapping the
 * existing `loadMarketPosition` — read-only, no contract or write-path logic.
 * The list/per-pool views (R5, R7) and the Borrow-variant PoolInfo health need
 * one pool's position, not the cross-pool aggregate `usePosition` builds. The
 * query is disabled until a wallet is connected; an unknown id resolves to
 * `null` instead of throwing.
 */
export function useMarketPosition(
  id: string,
  options: UseMarketPositionOptions = {},
): QueryResult<MarketPosition | null> {
  const { address: connected, isConnected } = useAccount()
  const address = options.address ?? connected ?? PREVIEW_ADDRESS
  const config = getMarketConfig(id)
  const enabled = (options.enabled ?? isConnected) && config !== undefined
  const query = useQuery({
    queryKey: ['market-position', id, address],
    enabled,
    queryFn: () =>
      config
        ? loadMarketPosition(config, address, getAdapters().chain)
        : Promise.resolve(null),
  })
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
