import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { MOCK_MARKETS } from '../mock'
import { MarketDetail } from './MarketDetail'

function renderDetail() {
  return render(
    <DensityProvider>
      <MarketDetail market={MOCK_MARKETS[0]} />
    </DensityProvider>,
  )
}

describe('MarketDetail', () => {
  it('hosts the action panel and hides advanced stats in Simple density', () => {
    window.localStorage.setItem('density', 'simple')
    renderDetail()
    expect(screen.getByRole('button', { name: /Supply/ })).toBeTruthy()
    expect(screen.queryByText('LLTV')).toBeNull()
  })

  it('reveals LLTV in Pro density', () => {
    window.localStorage.setItem('density', 'pro')
    renderDetail()
    expect(screen.getByText('LLTV')).toBeTruthy()
  })
})
