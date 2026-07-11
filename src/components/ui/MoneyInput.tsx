import { useEffect, useRef } from 'react'
import {
  formatNumber,
  formatTokenAmount,
  formatUsd,
  toNumber,
} from '#/lib/format'
import { AmountSlider } from './AmountSlider'

export type Denomination = 'token' | 'usd'

export interface MoneyInputProps {
  symbol: string
  decimals: number
  /** Controlled field string, in the active denomination's units. */
  value: string
  onChange: (value: string) => void
  /** Wallet balance in base units — drives the balance line and insufficient check. */
  balance?: bigint
  /** Price for the USD equivalent line. */
  priceUsd?: number
  denomination?: Denomination
  /** Fill basis for the slider and MAX (gas-reserved / risk-bounded), token units. */
  maxTokens?: number
  /** Injected context-aware MAX (gas-reserved for native, risk-bounded for borrow/withdraw). */
  onMax?: () => void
  onQuickFill?: (fraction: number) => void
  maxLabel?: string
  /** Label for the balance line (e.g. "Your Balance", "Supplied"). */
  balanceLabel?: string
  /** Externally supplied validation message (overrides the built-in insufficient check). */
  error?: string
  autoFocus?: boolean
}

/**
 * Money amount input (U6, R19–R21). A token amount with a balance line, a
 * drag slider that fills by fraction of the max, and a separate MAX button —
 * kept data-agnostic via injected callbacks. Blocks obviously-invalid input
 * before any submit.
 */
export function MoneyInput({
  symbol,
  decimals,
  value,
  onChange,
  balance,
  priceUsd,
  denomination = 'token',
  maxTokens,
  onMax,
  onQuickFill,
  maxLabel = 'Max',
  balanceLabel = 'Your Balance',
  error,
  autoFocus = false,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const typed = value === '' ? 0 : Number(value)
  const validNumber = value === '' || Number.isFinite(typed)
  const balanceTokens =
    balance !== undefined ? toNumber(balance, decimals) : undefined
  const tokenAmount =
    denomination === 'token' ? typed : priceUsd ? typed / priceUsd : 0
  const usdAmount =
    denomination === 'usd'
      ? typed
      : priceUsd !== undefined
        ? typed * priceUsd
        : 0

  // The "Your Balance" line shows the wallet balance (display); validation is
  // against `maxTokens` — the action's real cap (wallet for supply/repay,
  // collateral for withdraw, max-borrow for borrow), which MAX and the slider
  // also use. Keeping them separate lets a panel show the wallet balance while
  // capping at a different amount.
  const overCap =
    maxTokens !== undefined && tokenAmount > maxTokens + 1e-9
  const capNoun = maxLabel && maxLabel !== 'Max' ? maxLabel.toLowerCase() : 'available'
  const validationMessage =
    error ??
    (!validNumber
      ? 'Enter a valid amount'
      : overCap
        ? `Exceeds ${capNoun} (${formatNumber(maxTokens, { maxFractionDigits: 6 })} ${symbol})`
        : undefined)

  const equiv =
    priceUsd !== undefined
      ? `≈ ${formatUsd(usdAmount)}`
      : denomination === 'usd'
        ? `≈ ${formatNumber(tokenAmount, { maxFractionDigits: 6 })} ${symbol}`
        : null

  // The slider thumb reflects the current input as a fraction of the fill basis.
  const fillFraction =
    maxTokens && maxTokens > 0
      ? Math.max(0, Math.min(1, tokenAmount / maxTokens))
      : 0
  const canFill = onQuickFill !== undefined && (maxTokens ?? 0) > 0
  // The balance line reads "Your Balance" by default (matching the mockup);
  // callers can override `balanceLabel` (e.g. "Supplied" on withdraw). The token
  // symbol is already in the panel header, so it is not repeated on the left.

  return (
    <div className="flex flex-col gap-1.5">
      {balanceTokens !== undefined ? (
        <div className="flex items-center justify-between px-1 text-[0.75rem]">
          <span className="font-bold text-[var(--sea-ink)]">
            {balanceLabel}
          </span>
          <span className="num text-[var(--sea-ink-soft)]">
            {formatTokenAmount(balance!, decimals)} {symbol}
          </span>
        </div>
      ) : null}

      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{
          borderColor: validationMessage ? 'var(--danger)' : 'var(--line)',
          background:
            'color-mix(in oklab, var(--surface-strong) 88%, white 12%)',
        }}
      >
        <input
          ref={inputRef}
          aria-label="Amount"
          aria-invalid={validationMessage ? true : undefined}
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="num min-w-0 flex-1 bg-transparent text-lg font-semibold text-[var(--sea-ink)] outline-none"
        />
        {onMax && (maxTokens ?? 0) > 0 ? (
          <button
            type="button"
            onClick={onMax}
            className="shrink-0 rounded-full px-3 py-1 text-[0.72rem] font-bold"
            style={{ background: 'var(--safe-soft)', color: 'var(--palm)' }}
          >
            {maxLabel}
          </button>
        ) : null}
      </div>

      {onQuickFill ? (
        <AmountSlider
          value={fillFraction}
          onChange={onQuickFill}
          disabled={!canFill}
        />
      ) : null}

      <div className="flex items-center justify-between text-[0.75rem]">
        {equiv ? (
          <span className="text-[var(--sea-ink-soft)]">{equiv}</span>
        ) : (
          <span />
        )}
        {validationMessage ? (
          <span style={{ color: 'var(--danger)' }} role="alert">
            {validationMessage}
          </span>
        ) : null}
      </div>
    </div>
  )
}
