import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { useMarkets } from '../hooks/useMarkets'
import { MarketList } from './MarketList'

vi.mock('../hooks/useMarkets', () => ({ useMarkets: vi.fn() }))

const mockUseMarkets = vi.mocked(useMarkets)

function renderList() {
  return render(
    <DensityProvider>
      <MarketList />
    </DensityProvider>,
  )
}

// Covers R14: every surface renders loading / empty / error explicitly.
describe('MarketList states', () => {
  it('shows an error state when the adapter rejects', () => {
    mockUseMarkets.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('rpc unreachable'),
    })
    renderList()
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/Could not load markets/)).toBeTruthy()
  })

  it('shows an empty state when there are no markets', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: false, error: null })
    renderList()
    expect(screen.getByText('No markets yet')).toBeTruthy()
  })

  it('shows a loading state while pending', () => {
    mockUseMarkets.mockReturnValue({ data: [], isLoading: true, error: null })
    renderList()
    // Loading cards expose role="status"; no table/data rendered yet.
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })
})
