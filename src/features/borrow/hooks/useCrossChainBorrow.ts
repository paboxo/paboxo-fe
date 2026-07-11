/**
 * Cross-chain borrow to Base (R4–R11). Borrow pxUSDT against HashKey collateral
 * and receive it on Base: the borrow tx stays on HashKey (no network switch, no
 * approval — the user receives funds), but `borrowDebt` runs with `chainId=8453`
 * and the quoted CCIP fee as `msg.value`, so the borrowed asset is bridged out.
 *
 * The fee is real (KTD1: HelperUtils.getFee, else an InsufficientFee revert-probe).
 * After the HashKey tx confirms, delivery on Base is still in flight — a `bridging`
 * state until observed. Only the (mock) indexer can observe delivery today, so in
 * live mode we never fake `delivered`; real messageId parsing is a follow-up.
 */
import { useCallback, useState } from 'react'
import { parseUnits } from 'viem'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { BASE } from '#/lib/contracts'
import type { Address } from '#/lib/contracts'
import { DATA_MODE } from '#/lib/config/env'
import { getAdapters } from '#/lib/data'
import type { Hash } from '#/lib/data'
import { availableLiquidity } from '#/lib/math'
import { preflightCrossChainBorrow, unixNow } from '#/lib/tx/preflight'
import { useWriteAction } from '#/lib/tx/useWriteAction'
import { WRITE_INVALIDATE_KEYS } from '#/features/shared/writeKeys'
import type { MarketView } from '#/features/markets/types'

/** Destination gas for the receiver mint on Base. A cross-chain borrow does not
 *  deploy a Position (unlike a first supply), so it needs less than supply's 5M;
 *  kept generous pending the mainnet floor check (KTD7). */
const DEST_GAS_LIMIT = 500_000

/** Headroom left for the borrow tx's own gas on top of the CCIP fee (R9). */
const GAS_HEADROOM = 2_000_000_000_000_000n // ~0.002 HSK

/** The CCIP fee can rise between the quote and mining. The contract refunds any
 *  excess `msg.value` (verified in LendingPool._borrowDebtCrosschain), so send a
 *  small headroom over the quote to survive drift; the surplus is returned. */
const withFeeBuffer = (quotedFee: bigint) => quotedFee + quotedFee / 5n // +20%

// A stand-in CCIP messageId used only in mock data mode.
const MOCK_MESSAGE_ID: Hash =
  '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'

export type BridgeStatus = 'idle' | 'bridging' | 'delivered'

/** The outcome of a borrow attempt, so a caller can drive its tracker imperatively
 *  without racing the hook's transient `bridgeStatus` through re-renders. */
export interface BorrowOutcome {
  /** The HashKey borrow tx confirmed (debt booked, CCIP send fired). */
  confirmed: boolean
  /** Delivery on Base was observed (only possible via a real indexer; mock only). */
  delivered: boolean
}

/** The `BorrowParams` for a Base-destined cross-chain borrow of `amount`. */
function baseBorrowParams(amount: bigint) {
  return { amount, chainId: BigInt(BASE.id), destGasLimit: DEST_GAS_LIMIT }
}

/**
 * Reactive CCIP fee for a Base borrow of `amountTokens` (R8). Fires only when the
 * Base destination is active and the amount is positive; the query errors (and the
 * panel keeps submit disabled) when the amount is not yet a valid borrow — the
 * revert-probe cannot quote an invalid borrow (KTD8).
 */
export function useCrossChainBorrowFee(
  market: MarketView,
  amountTokens: number,
  enabled: boolean,
) {
  const { address } = useAccount()
  const amount =
    enabled && amountTokens > 0
      ? parseUnits(String(amountTokens), market.borrowDecimals)
      : 0n
  return useQuery<bigint>({
    queryKey: [
      'xchain-borrow-fee',
      market.poolAddress,
      amount.toString(),
      address,
    ],
    enabled: enabled && !!address && amount > 0n,
    retry: false,
    queryFn: () =>
      getAdapters().chain.quoteCrossChainBorrow(
        market.poolAddress,
        baseBorrowParams(amount),
        address as Address,
      ),
  })
}

export function useCrossChainBorrow(market: MarketView) {
  const write = useWriteAction()
  const { address } = useAccount()
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle')
  const [messageId, setMessageId] = useState<Hash | null>(null)

  const borrow = useCallback(
    async (amount: bigint, onBehalf?: Address): Promise<BorrowOutcome> => {
      const borrower = onBehalf ?? address
      if (!borrower || !address) return { confirmed: false, delivered: false }
      setBridgeStatus('idle')
      setMessageId(null)
      const isThirdParty = borrower !== address
      const { chain, indexer } = getAdapters()
      const params = baseBorrowParams(amount)

      const [totals, maxBorrow, price, nativeBalance, delegation, quotedFee] =
        await Promise.all([
          chain.getMarketTotals(market.poolAddress),
          chain.getMaxBorrowAmount(market.poolAddress, borrower),
          chain.getPrice(market.collateralAddress),
          chain.getNativeBalance(address),
          isThirdParty
            ? chain.getBorrowDelegation(market.poolAddress, borrower, address)
            : Promise.resolve(0n),
          chain.quoteCrossChainBorrow(market.poolAddress, params, borrower),
        ])
      // Attach a small buffer over the quote; the contract refunds the excess.
      const fee = withFeeBuffer(quotedFee)

      const confirmed = await write.run({
        preflight: preflightCrossChainBorrow(
          {
            amount,
            maxBorrowAmount: maxBorrow,
            availableLiquidity: availableLiquidity(
              totals.totalSupplyAssets,
              totals.totalBorrowAssets,
            ),
            priceUpdatedAt: price.updatedAt,
            nowSeconds: unixNow(),
            onBehalf: isThirdParty,
            hasDelegation: isThirdParty ? delegation >= amount : true,
          },
          { nativeBalance, fee, gasHeadroom: GAS_HEADROOM },
        ),
        // No approval — the user receives funds, not sends a token (R7).
        send: () => chain.borrowDebt(market.poolAddress, params, borrower, fee),
        invalidateKeys: WRITE_INVALIDATE_KEYS,
      })
      if (!confirmed) return { confirmed: false, delivered: false }

      // HashKey tx confirmed; delivery on Base is pending.
      setBridgeStatus('bridging')
      // Only the mock indexer can observe delivery today. In live mode we never
      // promote to 'delivered' from a fabricated id (R11); real messageId parsing
      // from the BorrowDebtCrossChain receipt is a follow-up.
      let delivered = false
      if (DATA_MODE === 'mock') {
        setMessageId(MOCK_MESSAGE_ID)
        const status = await indexer.getCrossChainStatus(MOCK_MESSAGE_ID)
        if (status.status === 'delivered') {
          setBridgeStatus('delivered')
          delivered = true
        }
      }
      return { confirmed: true, delivered }
    },
    [address, market.poolAddress, market.collateralAddress, write],
  )

  return { ...write, borrow, bridgeStatus, messageId }
}
