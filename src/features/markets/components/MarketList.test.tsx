import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { MarketList } from './MarketList'

function renderList() {
  return render(
    <DensityProvider>
      <MarketList />
    </DensityProvider>,
  )
}

describe('MarketList', () => {
  it('renders every market as a card in Simple density', () => {
    window.localStorage.setItem('density', 'simple')
    renderList()
    expect(screen.getAllByRole('article').length).toBe(4)
  })

  it('renders one dense table in Pro density', () => {
    window.localStorage.setItem('density', 'pro')
    renderList()
    expect(screen.getByRole('table')).toBeTruthy()
    // header row + one row per market
    expect(screen.getAllByRole('row').length).toBe(5)
  })
})
