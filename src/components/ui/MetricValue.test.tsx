// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricValue } from './MetricValue'
import { METRICS } from './metrics'

describe('MetricValue', () => {
  it('renders a metric with its canonical label from the registry', () => {
    render(<MetricValue metric="supplyApy" value="5.24%" />)
    expect(screen.getByText('Supply APY')).toBeTruthy()
    expect(screen.getByText('5.24%')).toBeTruthy()
    expect(METRICS.supplyApy.tone).toBe('positive')
  })

  it('renders a negative delta with an arrow and a signed value, not color alone', () => {
    render(<MetricValue label="Net APY" value="4.12%" delta={-0.8} />)
    const delta = screen.getByText(/-0\.80%/)
    expect(delta.textContent).toContain('↓')
    expect(delta.getAttribute('data-direction')).toBe('down')
  })

  it('keeps a stable label and tone per metric key', () => {
    expect(METRICS.borrowApr.label).toBe('Borrow APR')
    expect(METRICS.utilization.tone).toBe('neutral')
    expect(METRICS.netWorth.label).toBe('Net worth')
  })
})
