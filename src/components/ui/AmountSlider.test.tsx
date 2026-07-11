import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AmountSlider } from './AmountSlider'

const LABEL = 'Fill amount by percentage of balance'

describe('AmountSlider', () => {
  it('reflects the current fill fraction on the thumb', () => {
    render(<AmountSlider value={0.5} onChange={() => {}} />)
    const slider = screen.getByLabelText<HTMLInputElement>(LABEL)
    expect(slider.value).toBe('50')
    expect(slider.getAttribute('aria-valuetext')).toBe('50%')
  })

  it('emits the chosen fraction on change', () => {
    const onChange = vi.fn()
    render(<AmountSlider value={0} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: '75' } })
    expect(onChange).toHaveBeenCalledWith(0.75)
  })

  it('renders the percentage markers', () => {
    render(<AmountSlider value={0} onChange={() => {}} />)
    for (const marker of ['0%', '25%', '50%', '75%', '100%']) {
      expect(screen.getByText(marker)).toBeTruthy()
    }
  })

  it('disables when balance is zero', () => {
    render(<AmountSlider value={0} onChange={() => {}} disabled />)
    expect(screen.getByLabelText<HTMLInputElement>(LABEL).disabled).toBe(true)
  })

  it('is a native range carrying the .amount-slider a11y contract', () => {
    // The ≥44px hit area (WCAG 2.5.5) and the :focus-visible ring live on the
    // `.amount-slider` rule in styles.css — not measurable in jsdom, so assert
    // the element is a native range input carrying that class (its contract).
    render(<AmountSlider value={0.25} onChange={() => {}} />)
    const slider = screen.getByLabelText<HTMLInputElement>(LABEL)
    expect(slider.getAttribute('type')).toBe('range')
    expect(slider.classList.contains('amount-slider')).toBe(true)
  })
})
