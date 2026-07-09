import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { BorrowActions } from './BorrowActions'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)
const market = MOCK_MARKETS[0] // pxwhsk, collateral pxWHSK

beforeEach(() => {
  mockUseAccount.mockReturnValue({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useSwitchChain>)
})

function renderActions(hasCollateral: boolean) {
  return render(
    <BorrowActions market={market} hasCollateral={hasCollateral} />,
    { wrapper: QueryWrapper },
  )
}

// Covers AE1, AE7, R13.
describe('BorrowActions', () => {
  it('offers collateral, borrow, repay, and withdraw once collateral exists', () => {
    renderActions(true)
    for (const label of ['Supply', 'Borrow', 'Repay', 'Withdraw']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy()
    }
    // Default Borrow tab exposes the Borrow action button.
    expect(screen.getByRole('button', { name: /^Borrow$/ })).toBeTruthy()
    // The Supply tab supplies collateral (pxWHSK), never pxUSDT liquidity.
    fireEvent.click(screen.getByRole('tab', { name: 'Supply' }))
    expect(screen.getByText(`Supply ${market.collateralSymbol}`)).toBeTruthy()
  })

  it('gates a first-time borrower behind "Supply collateral first"', () => {
    renderActions(false)
    // Borrow action is unavailable until collateral exists.
    expect(screen.queryByRole('button', { name: /^Borrow$/ })).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: /Supply collateral first/ }),
    )
    // Activating the CTA switches to the collateral supply action.
    expect(screen.getByText(`Supply ${market.collateralSymbol}`)).toBeTruthy()
  })
})
