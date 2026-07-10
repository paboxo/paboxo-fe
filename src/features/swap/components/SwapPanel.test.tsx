import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  it('renders the market, amount, target token, and slippage controls', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Swap' })).toBeTruthy()
    // Slippage is now a chip group; the 0.5% default is active.
    expect(
      screen.getByRole('button', { name: '0.5%' }).getAttribute('aria-pressed'),
    ).toBe('true')
    // The target token trigger shows the default (pxUSDT).
    expect(screen.getByRole('button', { name: /pxUSDT/ })).toBeTruthy()
    // Amount empty -> the swap stays disabled until an amount is entered.
    expect(
      screen.getByRole('button', { name: 'Swap' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('opens the token dialog and switches the target token', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /pxUSDT/ }))
    expect(screen.getByRole('dialog', { name: 'Select a token' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /pxWETH/ }))
    // Selecting closes the dialog and the trigger reflects the new token.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: /pxWETH/ })).toBeTruthy()
  })
})
