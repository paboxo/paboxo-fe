import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '../mock'
import { MarketDetail } from './MarketDetail'

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

function renderDetail() {
  return render(
    <QueryWrapper>
      <DensityProvider>
        <MarketDetail market={MOCK_MARKETS[0]} />
      </DensityProvider>
    </QueryWrapper>,
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
