import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { LiquidatePanel } from './components/LiquidatePanel'
import { CreatePoolPanel } from '#/features/pool-create/components/CreatePoolPanel'

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

const market = MOCK_MARKETS[0]
const target = {
  borrower: '0x742d35Cc6634C0532925a3b844Bc9e7595f89f3A',
  debtUsd: 3200,
  bonusPct: 8,
  healthFactor: 0.95,
}

function renderLiquidate(healthFactor = target.healthFactor) {
  return render(
    <QueryWrapper>
      <LiquidatePanel market={market} target={{ ...target, healthFactor }} />
    </QueryWrapper>,
  )
}

describe('LiquidatePanel', () => {
  it('is actionable (behind an acknowledgement) for an unhealthy borrower', () => {
    renderLiquidate(0.95)
    const button = screen.getByRole('button', { name: /Liquidate/ })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('is not actionable for a healthy borrower', () => {
    renderLiquidate(2.0)
    expect(screen.queryByRole('button', { name: /Liquidate/ })).toBeNull()
    expect(screen.getByText(/healthy and can’t be liquidated/)).toBeTruthy()
  })
})

describe('CreatePoolPanel', () => {
  it('blocks a below-minimum seed and enables at/above the minimum once acknowledged', async () => {
    render(
      <QueryWrapper>
        <CreatePoolPanel minSeed={1000} />
      </QueryWrapper>,
    )
    const button = screen.getByRole('button', { name: /Create pool/ })
    const seed = screen.getByLabelText('Seed liquidity')

    fireEvent.change(seed, { target: { value: '500' } })
    expect(screen.getByRole('alert').textContent).toMatch(/at least 1000/)
    expect(button.hasAttribute('disabled')).toBe(true)

    fireEvent.change(seed, { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('checkbox'))

    // The seed amount cannot be scaled until decimals() is verified on-chain
    // (R31), so the button stays disabled while that read is in flight.
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  })
})
