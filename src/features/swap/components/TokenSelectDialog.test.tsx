import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { WAD } from '#/lib/math'
import type { TokenBalances } from '#/features/shared/useTokenBalances'
import { TokenSelectDialog } from './TokenSelectDialog'

const balances: TokenBalances = {
  pxUSDT: 25_000_000_000n,
  pxWHSK: 40_000n * WAD,
  pxWBTC: 15_000_000n,
  pxWETH: 5n * WAD,
}

function setup(overrides: Record<string, unknown> = {}) {
  const onSelect = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <TokenSelectDialog
      open
      onOpenChange={onOpenChange}
      selected="pxUSDT"
      onSelect={onSelect}
      balances={balances}
      disabledSymbol="pxWHSK"
      {...overrides}
    />,
  )
  return { onSelect, onOpenChange }
}

describe('TokenSelectDialog', () => {
  it('lists every token with its balance', () => {
    setup()
    expect(screen.getByRole('button', { name: /pxUSDT/ }).textContent).toMatch(
      /25[,]?000/,
    )
    expect(screen.getByRole('button', { name: /pxWETH/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /pxWBTC/ })).toBeTruthy()
  })

  it('selects a token and closes the dialog', () => {
    const { onSelect, onOpenChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: /pxWETH/ }))
    expect(onSelect).toHaveBeenCalledWith('pxWETH')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables the swap-from token so it cannot be picked', () => {
    const { onSelect } = setup()
    const whsk = screen.getByRole('button', { name: /pxWHSK/ })
    expect(whsk.hasAttribute('disabled')).toBe(true)
    fireEvent.click(whsk)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
