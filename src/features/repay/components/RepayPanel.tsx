import { useState } from 'react'
import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { ChevronDown } from 'lucide-react'
import { ActionPanel } from '#/components/action/ActionPanel'
import { NETWORK_FEE_HSK } from '#/lib/tx/networkFee'
import { TokenGlyph } from '#/components/ui/TokenGlyph'
import { positiveAmount, staleBlockReason } from '#/features/markets/gates'
import { formatTokenAmount, toNumber } from '#/lib/format'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import type { MarketView } from '#/features/markets/types'
import { useRepay } from '../hooks/useRepay'

/** The two supported repay sources (the contract only pays from the wallet's
 *  borrow token or the position's own collateral). */
interface RepaySource {
  key: 'wallet' | 'collateral'
  symbol: string
  address: string
  /** Sub-line under the symbol in the picker (the source's balance). */
  detail: string
}

/** Picker to the right of the "Repay" header: choose whether to pay the debt
 *  from your wallet (borrow token) or by selling your position collateral. */
function RepaySourceSelect({
  sources,
  selected,
  onSelect,
}: {
  sources: RepaySource[]
  selected: RepaySource
  onSelect: (key: RepaySource['key']) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-bold text-[var(--sea-ink)] transition-colors hover:border-[var(--sea-ink-soft)]"
      >
        <TokenGlyph
          symbol={selected.symbol}
          address={selected.address as `0x${string}`}
          size={20}
        />
        {selected.symbol}
        <ChevronDown
          size={16}
          className="text-[var(--sea-ink-soft)]"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            aria-label="Repay from"
            className="island-shell absolute right-0 z-20 mt-1 flex w-64 flex-col gap-0.5 rounded-xl p-1"
          >
            {sources.map((s) => (
              <button
                key={s.key}
                type="button"
                role="option"
                aria-selected={s.key === selected.key}
                onClick={() => {
                  onSelect(s.key)
                  setOpen(false)
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[var(--surface)]"
              >
                <TokenGlyph
                  symbol={s.symbol}
                  address={s.address as `0x${string}`}
                  size={20}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-[var(--sea-ink)]">
                    {s.symbol}
                  </span>
                  <span className="text-[0.62rem] text-[var(--sea-ink-soft)]">
                    {s.key === 'wallet' ? 'from wallet' : 'from collateral'}
                  </span>
                </span>
                <span className="num shrink-0 text-xs text-[var(--sea-ink-soft)]">
                  {s.detail}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Repay panel (U12). The amount is always the debt to clear, in the borrow token
 * (pxUSDT). The header selector chooses the source: pay from the wallet (borrow
 * token, path A) or by selling the position collateral (path C, `fromPosition`).
 */
export function RepayPanel({
  market,
  belowSlider,
}: {
  market: MarketView
  belowSlider?: ReactNode
}) {
  const { state, revert, repay } = useRepay(market)
  const [source, setSource] = useState<RepaySource['key']>('wallet')
  const fromCollateral = source === 'collateral'

  const { data: position } = useMarketPosition(market.id)
  const debt =
    position?.borrows.find((b) => b.symbol === market.borrowSymbol)?.debt ?? 0n
  const collateralRow = position?.supplies.find(
    (s) => s.symbol === market.collateralSymbol,
  )
  const { balance: walletBorrow } = useTokenBalance(market.borrowAddress)

  // MAX is the outstanding debt (you can't repay more than you owe). Paying from
  // the wallet also caps at the wallet's borrow-token balance.
  const debtTokens = toNumber(debt, market.borrowDecimals)
  const walletTokens = toNumber(walletBorrow ?? 0n, market.borrowDecimals)
  const maxTokens = fromCollateral
    ? debtTokens
    : Math.min(debtTokens, walletTokens)

  const sources: RepaySource[] = [
    {
      key: 'wallet',
      symbol: market.borrowSymbol,
      address: market.borrowAddress,
      detail: `${formatTokenAmount(walletBorrow ?? 0n, market.borrowDecimals, { compact: true })}`,
    },
    {
      key: 'collateral',
      symbol: market.collateralSymbol,
      address: market.collateralAddress,
      detail: collateralRow
        ? `${formatTokenAmount(collateralRow.balance, collateralRow.decimals, { compact: true })}`
        : '0',
    },
  ]
  const selected = sources.find((s) => s.key === source) ?? sources[0]

  const onSubmit = (amountTokens: number) => {
    void repay(
      parseUnits(amountTokens.toString(), market.borrowDecimals),
      fromCollateral,
    )
  }

  return (
    <ActionPanel
      title={`Repay ${market.borrowSymbol}`}
      idleLabel="Repay"
      symbol={market.borrowSymbol}
      tokenAddress={market.borrowAddress}
      decimals={market.borrowDecimals}
      priceUsd={1}
      balance={debt}
      balanceLabel="Debt"
      maxTokens={maxTokens}
      maxLabel="Debt"
      preflight={positiveAmount}
      blockReason={staleBlockReason(market)}
      networkFeeHsk={NETWORK_FEE_HSK}
      txState={state}
      revert={revert ?? undefined}
      belowSlider={belowSlider}
      headerRight={
        <RepaySourceSelect
          sources={sources}
          selected={selected}
          onSelect={setSource}
        />
      }
      onSubmit={onSubmit}
    />
  )
}
