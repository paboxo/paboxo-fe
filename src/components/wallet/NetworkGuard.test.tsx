import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { NetworkGuard } from './NetworkGuard'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))
// The real ConnectButton pulls in the AppKit modal; stub it for this unit.
vi.mock('./ConnectButton', () => ({
  default: () => <button type="button">Connect</button>,
}))

const mockUseAccount = vi.mocked(useAccount)

// Covers R15: the dashboard is connect-gated while the market view stays public.
describe('NetworkGuard', () => {
  it('prompts to connect when no wallet is connected', async () => {
    mockUseAccount.mockReturnValue({ isConnected: false } as ReturnType<
      typeof useAccount
    >)
    render(
      <NetworkGuard>
        <div>secret position</div>
      </NetworkGuard>,
    )
    expect(await screen.findByText('Connect your wallet')).toBeTruthy()
    expect(screen.queryByText('secret position')).toBeNull()
  })

  it('renders the guarded content once connected', async () => {
    mockUseAccount.mockReturnValue({ isConnected: true } as ReturnType<
      typeof useAccount
    >)
    render(
      <NetworkGuard>
        <div>secret position</div>
      </NetworkGuard>,
    )
    expect(await screen.findByText('secret position')).toBeTruthy()
    expect(screen.queryByText('Connect your wallet')).toBeNull()
  })
})
