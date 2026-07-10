import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '../mock'
import { MarketActions } from './MarketActions'

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

function renderActions() {
  return render(
    <QueryWrapper>
      <DensityProvider>
        <MarketActions market={MOCK_MARKETS[0]} />
      </DensityProvider>
    </QueryWrapper>,
  )
}

// Covers R11, R16: the market route hosts the write actions as one tabbed panel.
describe('MarketActions', () => {
  it('renders a tab for each core action', () => {
    renderActions()
    for (const label of ['Supply', 'Borrow', 'Repay', 'Withdraw']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy()
    }
  })

  it('defaults to the Supply action', () => {
    renderActions()
    expect(
      screen.getByRole('tab', { name: 'Supply' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('switches the panel when a different action tab is chosen', () => {
    renderActions()
    fireEvent.click(screen.getByRole('tab', { name: 'Borrow' }))
    expect(
      screen.getByRole('tab', { name: 'Borrow' }).getAttribute('aria-selected'),
    ).toBe('true')
    // The submit button reflects the active action.
    expect(screen.getByRole('button', { name: /Borrow/ })).toBeTruthy()
  })
})
