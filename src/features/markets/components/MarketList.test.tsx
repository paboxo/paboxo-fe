import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { QueryWrapper } from '#/test/utils'
import { MarketList } from './MarketList'

function renderList() {
  return render(
    <QueryWrapper>
      <DensityProvider>
        <MarketList />
      </DensityProvider>
    </QueryWrapper>,
  )
}

describe('MarketList', () => {
  it('renders every market as a card in Simple density', async () => {
    window.localStorage.setItem('density', 'simple')
    renderList()
    const articles = await screen.findAllByRole('article')
    expect(articles.length).toBe(3)
  })

  it('renders one dense table in Pro density', async () => {
    window.localStorage.setItem('density', 'pro')
    renderList()
    const table = await screen.findByRole('table')
    expect(table).toBeTruthy()
    // header row + one row per market
    expect(screen.getAllByRole('row').length).toBe(4)
  })
})
