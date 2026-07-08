import { useEffect, useRef } from 'react'
import {
  formatNumber,
  formatTokenAmount,
  formatUsd,
  toNumber,
} from '#/lib/format'
import { AmountChips } from './AmountChips'

export type Denomination = 'token' | 'usd'

export interface MoneyInputProps {
  symbol: string
  decimals: number
  /** Controlled field string, in the active denomination's units. */
  value: string
  onChange: (value: string) => void
  /** Wallet balance in base units — drives the balance line and insufficient check. */
  balance?: bigint
  /** Price for the USD equivalent and the token⟷USD flip. */
  priceUsd?: number
  denomination?: Denomination
  onToggleDenomination?: () => void
  /** Injected context-aware MAX (gas-reserved for native, risk-bounded for borrow/withdraw). */
  onMax?: () => void
  onQuickFill?: (fraction: number) => void
  maxLabel?: string
  /** Externally supplied validation message (overrides the built-in insufficient check). */
  error?: string
  autoFocus?: boolean
}

/**
 * Money amount input (U6, R19–R21). Token+USD with a flip, a balance line,
 * quick-fill chips, and an injected MAX so the component stays data-agnostic.
 * Blocks obviously-invalid input before any submit.
 */
export function MoneyInput({
  symbol,
  decimals,
  value,
  onChange,
  balance,
  priceUsd,
  denomination = 'token',
  onToggleDenomination,
  onMax,
  onQuickFill,
  maxLabel = 'Max',
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

  const insufficient =
    balanceTokens !== undefined && tokenAmount > balanceTokens + 1e-9
  const validationMessage =
    error ??
    (!validNumber
      ? 'Enter a valid amount'
      : insufficient
        ? `You only have ${formatTokenAmount(balance!, decimals, { full: true })} ${symbol}`
        : undefined)

  const equiv =
    denomination === 'token'
      ? priceUsd !== undefined
        ? `≈ ${formatUsd(usdAmount)}`
        : null
      : priceUsd
        ? `≈ ${formatNumber(tokenAmount, { maxFractionDigits: 6 })} ${symbol}`
        : null

  const prefix = denomination === 'usd' ? '$' : symbol

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[0.75rem] text-[var(--sea-ink-soft)]">
        <button
          type="button"
          onClick={onToggleDenomination}
          disabled={!onToggleDenomination || priceUsd === undefined}
          className="font-bold text-[var(--sea-ink)] disabled:cursor-default"
          aria-label="Switch denomination"
        >
          {prefix}
          {onToggleDenomination && priceUsd !== undefined ? ' ⇄' : ''}
        </button>
        {balanceTokens !== undefined ? (
          <span>
            Balance:{' '}
            <span className="num">
              {formatTokenAmount(balance!, decimals)} {symbol}
            </span>
          </span>
        ) : null}
      </div>

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
        {onQuickFill && onMax ? (
          <AmountChips
            onQuickFill={onQuickFill}
            onMax={onMax}
            maxLabel={maxLabel}
          />
        ) : null}
      </div>

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
