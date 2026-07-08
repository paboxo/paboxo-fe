import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { PositionDashboard } from './PositionDashboard'

function renderDashboard(empty = false) {
  return render(
    <QueryWrapper>
      <PositionDashboard empty={empty} />
    </QueryWrapper>,
  )
}

describe('PositionDashboard', () => {
  it('shows the hero numbers and a supply row for a funded position', async () => {
    renderDashboard()
    expect(await screen.findByText('Net worth')).toBeTruthy()
    expect(screen.getByText('Net APY')).toBeTruthy()
    expect(screen.getAllByText('pxUSDT').length).toBeGreaterThan(0)
  })

  it('teaches with an empty state and a Supply CTA for a new user', async () => {
    renderDashboard(true)
    expect(await screen.findByText('Put your assets to work')).toBeTruthy()
    expect(screen.getByText('Supply an asset')).toBeTruthy()
  })
})
