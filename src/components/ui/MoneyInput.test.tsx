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
  it('shows the balance line and denomination', () => {
    render(<MoneyInput {...base} value="" onChange={() => {}} />)
    expect(screen.getByText(/1,900 pxUSDT/)).toBeTruthy()
    expect(screen.getByLabelText('Switch denomination').textContent).toContain(
      'pxUSDT',
    )
  })

  it('signals quick-fill fractions and MAX rather than computing them itself', () => {
    const onQuickFill = vi.fn()
    const onMax = vi.fn()
    render(
      <MoneyInput
        {...base}
        value=""
        onChange={() => {}}
        onQuickFill={onQuickFill}
        onMax={onMax}
        maxLabel="Max (safe)"
      />,
    )
    fireEvent.click(screen.getByText('50%'))
    fireEvent.click(screen.getByText('Max (safe)'))
    expect(onQuickFill).toHaveBeenCalledWith(0.5)
    expect(onMax).toHaveBeenCalledOnce()
  })

  it('blocks an over-balance amount before submit', () => {
    render(<MoneyInput {...base} value="2500" onChange={() => {}} />)
    const input = screen.getByLabelText('Amount')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('alert').textContent).toContain('You only have')
  })

  it('auto-focuses the amount field when asked', () => {
    render(<MoneyInput {...base} value="" onChange={() => {}} autoFocus />)
    expect(document.activeElement).toBe(screen.getByLabelText('Amount'))
  })
})
