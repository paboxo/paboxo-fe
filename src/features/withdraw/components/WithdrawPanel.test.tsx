/**
 * WithdrawPanel guards one invariant above all: withdrawing collateral is NOT
 * blocked on a stale price. On-chain `isHealthy` returns early for a debt-free
 * position without reading the collateral oracle, so a borrower who has repaid
 * can always pull their collateral. Gating it on a stale feed — which a dedup
 * pass once did — would trap those funds behind a price the withdrawal never
 * consults. Supply/Borrow gate on staleness; Withdraw must not.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { QueryWrapper } from '#/test/utils'
import { makeMarket } from '#/features/markets/testFixtures'
import { useWithdraw } from '../hooks/useWithdraw'
import { WithdrawPanel } from './WithdrawPanel'

// The panel now reads the position collateral balance (useQuery + wagmi).
vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1111111111111111111111111111111111111111' }),
}))
vi.mock('../hooks/useWithdraw', () => ({ useWithdraw: vi.fn() }))

const renderPanel = (ui: ReactElement) =>
  render(ui, { wrapper: QueryWrapper })

const mockUseWithdraw = vi.mocked(useWithdraw)
const withdrawCollateral = vi.fn().mockResolvedValue(undefined)

const market = makeMarket({ id: '0xpool', collateralDecimals: 18 })

beforeEach(() => {
  withdrawCollateral.mockClear()
  mockUseWithdraw.mockReturnValue({
    state: 'idle',
    revert: undefined,
    withdrawCollateral,
  } as unknown as ReturnType<typeof useWithdraw>)
})

describe('WithdrawPanel', () => {
  it('stays enabled on a stale price — a debt-free owner must never be trapped', () => {
    renderPanel(<WithdrawPanel market={{ ...market, priceStale: true }} />)
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '5' },
    })
    const button = screen.getByRole('button', { name: /Withdraw/ })
    // No hard block: the only gate is the positive-amount preflight, which a
    // real amount satisfies. A stale price must not add an aria-describedby
    // block reason the way Supply/Borrow do.
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('aria-describedby')).toBeNull()
    expect(screen.queryByText(/price feed is stale/i)).toBeNull()
  })

  it('still blocks a non-positive amount', () => {
    renderPanel(<WithdrawPanel market={{ ...market, priceStale: true }} />)
    expect(
      screen.getByRole('button', { name: /Withdraw/ }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('scales the amount by the collateral decimals on submit', async () => {
    renderPanel(<WithdrawPanel market={market} />)
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '2.5' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Withdraw/ }))
    })
    await waitFor(() => expect(withdrawCollateral).toHaveBeenCalled())
    expect(withdrawCollateral).toHaveBeenCalledWith(2_500_000_000_000_000_000n)
  })
})
