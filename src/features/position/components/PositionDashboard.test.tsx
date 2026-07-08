import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PositionDashboard } from './PositionDashboard'

describe('PositionDashboard', () => {
  it('shows the hero numbers and a supply row for a funded position', () => {
    render(<PositionDashboard />)
    expect(screen.getByText('Net worth')).toBeTruthy()
    expect(screen.getByText('Net APY')).toBeTruthy()
    expect(screen.getAllByText('pxUSDT').length).toBeGreaterThan(0)
  })

  it('teaches with an empty state and a Supply CTA for a new user', () => {
    render(<PositionDashboard empty />)
    expect(screen.getByText('Put your assets to work')).toBeTruthy()
    expect(screen.getByText('Supply an asset')).toBeTruthy()
  })
})
