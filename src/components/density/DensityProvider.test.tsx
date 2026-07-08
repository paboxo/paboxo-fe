import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DensityProvider } from './DensityProvider'
import { useDensity } from './useDensity'

function Consumer() {
  const { density, toggle } = useDensity()
  return (
    <button type="button" onClick={toggle}>
      density:{density}
    </button>
  )
}

describe('DensityProvider', () => {
  it('defaults to Simple, toggles to Pro in place, and persists the choice', () => {
    window.localStorage.removeItem('density')
    render(
      <DensityProvider>
        <Consumer />
      </DensityProvider>,
    )
    const button = screen.getByRole('button')
    expect(button.textContent).toContain('simple')
    expect(document.documentElement.dataset.density).toBe('simple')

    fireEvent.click(button)
    expect(button.textContent).toContain('pro')
    expect(document.documentElement.dataset.density).toBe('pro')
    expect(window.localStorage.getItem('density')).toBe('pro')
  })

  it('requires the provider', () => {
    expect(() => render(<Consumer />)).toThrow(/DensityProvider/)
  })
})
