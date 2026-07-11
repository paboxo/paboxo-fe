import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ActionPanel } from '#/components/action/ActionPanel'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { TOKEN_REGISTRY } from '#/lib/tokens/registry'
import type { Address } from '#/lib/contracts'
import type { MarketView } from '#/features/markets/types'
import { useRepay } from '../hooks/useRepay'

interface RepayOption {
  address: Address
  symbol: string
  decimals: number
  isCollateral: boolean
  priceUsd: number | undefined
}

/** Repay-token options: the borrow token (mode A), the position collateral, and
 *  any other registry token (swapped on-chain). Mirrors senja's option set. */
function buildRepayOptions(market: MarketView): RepayOption[] {
  const borrow: RepayOption = {
    address: market.borrowAddress,
    symbol: market.borrowSymbol,
    decimals: market.borrowDecimals,
    isCollateral: false,
    priceUsd: 1,
  }
  const collateral: RepayOption = {
    address: market.collateralAddress,
    symbol: market.collateralSymbol,
    decimals: market.collateralDecimals,
    isCollateral: true,
    priceUsd: market.priceUsd,
  }
  const taken = new Set([
    market.borrowAddress.toLowerCase(),
    market.collateralAddress.toLowerCase(),
  ])
  const others: RepayOption[] = Object.entries(TOKEN_REGISTRY)
    .filter(([addr]) => !taken.has(addr.toLowerCase()))
    .map(([addr, entry]) => ({
      address: addr as Address,
      symbol: entry.label,
      decimals: entry.decimals,
      isCollateral: false,
      priceUsd: undefined,
    }))
  return [borrow, collateral, ...others]
}

/**
 * Repay panel (U12). Repays the borrow token directly, the position collateral,
 * or another wallet token (swapped on-chain). The hook converts the entered
 * amount to live debt shares and sizes the approval / slippage floor per source.
 */
export function RepayPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const { state, revert, repay } = useRepay(market)
  const options = useMemo(() => buildRepayOptions(market), [market])
  const [selectedAddress, setSelectedAddress] = useState<Address>(
    options[0].address,
  )
  const option =
    options.find((o) => o.address === selectedAddress) ?? options[0]

  const onSubmit = (amountTokens: number) => {
    void repay(parseUnits(amountTokens.toString(), option.decimals), {
      address: option.address,
      decimals: option.decimals,
      isCollateral: option.isCollateral,
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
        Repay with
        <select
          className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--sea-ink)]"
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value as Address)}
        >
          {options.map((o) => (
            <option key={o.address} value={o.address}>
              {o.symbol}
              {o.isCollateral ? ' (collateral)' : ''}
            </option>
          ))}
        </select>
      </label>
      <ActionPanel
        title={`Repay ${market.borrowSymbol}`}
        idleLabel="Repay"
        symbol={option.symbol}
        tokenAddress={option.address}
        decimals={option.decimals}
        priceUsd={option.priceUsd}
        maxTokens={1000}
        preflight={positiveAmount}
        blockReason={staleBlockReason(market)}
        networkFeeUsd={0.42}
        txState={state}
        revert={revert ?? undefined}
        belowSlider={belowSlider}
        onSubmit={onSubmit}
      />
    </div>
  )
}
