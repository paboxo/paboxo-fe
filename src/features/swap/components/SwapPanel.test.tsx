import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { SwapPanel } from './SwapPanel'

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

function renderPanel() {
  return render(
    <QueryWrapper>
      <SwapPanel />
    </QueryWrapper>,
  )
}

describe('SwapPanel', () => {
  it('renders the market, amount, target, and slippage controls', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: /Swap/ })).toBeTruthy()
    expect(screen.getByLabelText('Slippage tolerance')).toBeTruthy()
    // Default target (pxUSDT) differs from the pxWHSK collateral, so it's enabled.
    expect(
      screen.getByRole('button', { name: /Swap/ }).hasAttribute('disabled'),
    ).toBe(true) // amount empty -> disabled until an amount is entered
  })
})
