import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MoneyInput } from './MoneyInput'

const base = {
  symbol: 'pxUSDT',
  decimals: 6,
  balance: 1_900_000_000n, // 1,900 pxUSDT
  priceUsd: 1,
}

describe('MoneyInput', () => {
  it('shows the balance line and token symbol without a denomination toggle', () => {
    render(<MoneyInput {...base} value="" onChange={() => {}} />)
    expect(screen.getByText(/1,900 pxUSDT/)).toBeTruthy()
    // Default balance-line label matches the mockup.
    expect(screen.getByText('Your Balance')).toBeTruthy()
    // The ⇄ denomination toggle was removed (U5).
    expect(screen.queryByLabelText('Switch denomination')).toBeNull()
  })

  it('uses a caller-supplied balanceLabel over the default', () => {
    render(
      <MoneyInput {...base} value="" onChange={() => {}} balanceLabel="Supplied" />,
    )
    expect(screen.getByText('Supplied')).toBeTruthy()
    expect(screen.queryByText('Your Balance')).toBeNull()
  })

  it('signals quick-fill fractions via the slider and MAX via its button', () => {
    const onQuickFill = vi.fn()
    const onMax = vi.fn()
    render(
      <MoneyInput
        {...base}
        value=""
        onChange={() => {}}
        maxTokens={1900}
        onQuickFill={onQuickFill}
        onMax={onMax}
        maxLabel="Max (safe)"
      />,
    )
    fireEvent.change(
      screen.getByLabelText('Fill amount by percentage of balance'),
      { target: { value: '50' } },
    )
    fireEvent.click(screen.getByText('Max (safe)'))
    expect(onQuickFill).toHaveBeenCalledWith(0.5)
    expect(onMax).toHaveBeenCalledOnce()
  })

  it('flags an amount over the cap (maxTokens) before submit', () => {
    render(
      <MoneyInput {...base} value="2500" maxTokens={1900} onChange={() => {}} />,
    )
    const input = screen.getByLabelText('Amount')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toContain('Exceeds')
  })

  it('auto-focuses the amount field when asked', () => {
    render(<MoneyInput {...base} value="" onChange={() => {}} autoFocus />)
    expect(document.activeElement).toBe(screen.getByLabelText('Amount'))
  })
})
