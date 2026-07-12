import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ChainSelectDialog } from './ChainSelectDialog'

function setup(overrides: Record<string, unknown> = {}) {
  const onSelect = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <ChainSelectDialog
      open
      onOpenChange={onOpenChange}
      selected="hashkey"
      onSelect={onSelect}
      baseEnabled
      {...overrides}
    />,
  )
  return { onSelect, onOpenChange }
}

// Covers R1, R2.
describe('ChainSelectDialog', () => {
  it('lists HashKey (pre-selected) and Base', () => {
    setup()
    const hashkey = screen.getByRole('button', { name: /HashKey/ })
    expect(hashkey.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Base/ })).toBeTruthy()
  })

  it('selecting Base fires onSelect and closes the dialog', () => {
    const { onSelect, onOpenChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: /Base/ }))
    expect(onSelect).toHaveBeenCalledWith('base')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables Base with a caption when the rail is off (not omitted)', () => {
    const { onSelect } = setup({ baseEnabled: false })
    const base = screen.getByRole('button', { name: /Base/ })
    // Present but disabled — the affordance stays discoverable.
    expect(base).toBeTruthy()
    expect((base as HTMLButtonElement).disabled).toBe(true)
    expect(base.textContent).toMatch(/unavailable/i)
    fireEvent.click(base)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
