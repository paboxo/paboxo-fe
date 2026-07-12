// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import type { MarketPosition } from '#/features/position/hooks/usePosition'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { PoolPositionCard } from './PoolPositionCard'

vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(),
}))
const mockUseMarketPosition = vi.mocked(useMarketPosition)

const market = MOCK_MARKETS[0]

const position: MarketPosition = {
  supplies: [
    {
      symbol: market.collateralSymbol,
      balance: 1n,
      decimals: 18,
      valueUsd: 600,
      apy: 0,
    },
  ],
  borrows: [],
  healthFactor: 1.4,
}

describe('PoolPositionCard details', () => {
  it('collapses the chart + protection behind an expander, closed by default', () => {
    mockUseMarketPosition.mockReturnValue({
      data: position,
      isLoading: false,
      error: null,
    })

    render(
      <PoolPositionCard market={market}>
        <div>extra-content</div>
      </PoolPositionCard>,
    )

    // Key figures are always visible; the extras start hidden.
    expect(screen.getByText('Collateral')).toBeTruthy()
    expect(screen.queryByText('extra-content')).toBeNull()

    const toggle = screen.getByRole('button', {
      name: /Supply chart & protection/,
    })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(screen.getByText('extra-content')).toBeTruthy()
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe(
      'true',
    )
  })
})
