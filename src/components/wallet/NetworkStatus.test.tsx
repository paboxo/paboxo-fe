import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAccount } from 'wagmi'
import { HASHKEY } from '#/lib/contracts'
import { NetworkStatus } from './NetworkStatus'

vi.mock('wagmi', () => ({ useAccount: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)

describe('NetworkStatus', () => {
  it('renders nothing when disconnected', () => {
    mockUseAccount.mockReturnValue({ isConnected: false } as ReturnType<
      typeof useAccount
    >)
    const { container } = render(<NetworkStatus />)
    expect(container.textContent).toBe('')
  })

  it('shows the chain name when connected to HashKey 177', async () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chain: { id: HASHKEY.id, name: HASHKEY.name },
    } as ReturnType<typeof useAccount>)
    render(<NetworkStatus />)
    expect(await screen.findByText(HASHKEY.name)).toBeTruthy()
  })

  it('warns when connected to the wrong network', async () => {
    mockUseAccount.mockReturnValue({
      isConnected: true,
      chain: { id: 1, name: 'Ethereum' },
    } as ReturnType<typeof useAccount>)
    render(<NetworkStatus />)
    expect(await screen.findByText('Wrong network')).toBeTruthy()
  })
})
