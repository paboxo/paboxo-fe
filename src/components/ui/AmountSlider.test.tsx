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
})
