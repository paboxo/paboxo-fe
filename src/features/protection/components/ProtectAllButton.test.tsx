// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { useAgentProtection } from '../hooks/useAgentProtection'
import { ProtectAllButton } from './ProtectAllButton'
import { ProtectionToggle } from './ProtectionToggle'

vi.mock('#/features/markets/hooks/useMarkets', () => ({ useMarkets: vi.fn() }))
vi.mock('../hooks/useAgentProtection', () => ({ useAgentProtection: vi.fn() }))

const mockUseMarkets = vi.mocked(useMarkets)
const mockUseAgentProtection = vi.mocked(useAgentProtection)

const markets = MOCK_MARKETS.slice(0, 3)
const [m0, m1, m2] = markets

type Handle = ReturnType<typeof useAgentProtection>

function handle(over: Partial<Handle>): Handle {
  return {
    active: false,
    isStatusLoading: false,
    unconfigured: false,
    enable: vi.fn().mockResolvedValue(true),
    disable: vi.fn().mockResolvedValue(true),
    state: 'idle',
    revert: null,
    isPending: false,
    isError: false,
    run: vi.fn(),
    reset: vi.fn(),
    ...over,
  }
}

beforeEach(() => {
  mockUseMarkets.mockReturnValue({
    data: markets,
    isLoading: false,
    error: null,
  })
})

describe('ProtectAllButton', () => {
  it('fires one write per unprotected pool with per-pool progress (AE4)', async () => {
    const enable1 = vi.fn().mockResolvedValue(true)
    const enable2 = vi.fn().mockResolvedValue(true)
    const enable0 = vi.fn().mockResolvedValue(true)
    const byId: Record<string, Handle> = {
      [m0.id]: handle({ active: true, enable: enable0 }),
      [m1.id]: handle({ active: false, enable: enable1 }),
      [m2.id]: handle({ active: false, enable: enable2 }),
    }
    mockUseAgentProtection.mockImplementation((market) => byId[market.id])

    render(<ProtectAllButton />)

    expect(screen.getByText('2 pools not yet protected.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Protect all' }))

    // The already-protected pool is skipped; the two unprotected pools each get
    // exactly one write.
    await waitFor(() => expect(enable1).toHaveBeenCalledTimes(1))
    expect(enable2).toHaveBeenCalledTimes(1)
    expect(enable0).not.toHaveBeenCalled()

    // Per-pool progress ends protected for both.
    await waitFor(() => expect(screen.getAllByText('Protected').length).toBe(2))
  })

  it('leaves a visible mixed state when one pool fails (AE4)', async () => {
    const enable1 = vi.fn().mockResolvedValue(true)
    const enable2 = vi.fn().mockResolvedValue(false)
    const byId: Record<string, Handle> = {
      [m0.id]: handle({ active: true }),
      [m1.id]: handle({ active: false, enable: enable1 }),
      [m2.id]: handle({ active: false, enable: enable2 }),
    }
    mockUseAgentProtection.mockImplementation((market) => byId[market.id])

    render(<ProtectAllButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Protect all' }))

    await waitFor(() => expect(screen.getByText('Protected')).toBeTruthy())
    expect(screen.getByText('Failed')).toBeTruthy()
    expect(screen.getByText(/Some pools/)).toBeTruthy()
  })

  it('disables the control when every pool is already protected', () => {
    mockUseAgentProtection.mockImplementation(() => handle({ active: true }))

    render(<ProtectAllButton />)

    expect(screen.getByText('All your pools are protected.')).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Protect all' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })
})

describe('ProtectionToggle (AE3)', () => {
  it('enables protection for the pool when off', () => {
    const enable = vi.fn().mockResolvedValue(true)
    mockUseAgentProtection.mockReturnValue(handle({ active: false, enable }))

    render(<ProtectionToggle market={m0} />)
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(sw)
    expect(enable).toHaveBeenCalledTimes(1)
  })

  it('disables protection for the pool when on', () => {
    const disable = vi.fn().mockResolvedValue(true)
    mockUseAgentProtection.mockReturnValue(handle({ active: true, disable }))

    render(<ProtectionToggle market={m0} />)
    const sw = screen.getByRole('switch')
    expect(sw.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(sw)
    expect(disable).toHaveBeenCalledTimes(1)
  })
})
