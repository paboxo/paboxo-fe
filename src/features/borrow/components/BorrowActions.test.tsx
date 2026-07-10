import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { STALE_PRICE_REASON } from '#/features/markets/components/PoolBadges'
import type { MarketView } from '#/features/markets/types'
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

// --- U9: disabled-with-reason on a stale-priced pool (R10, AE2, AE3) ----------
const staleMarket: MarketView = {
  ...market,
  priceStale: true,
  priceUsd: undefined,
}

function borrowButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^Borrow$/ })
}

describe('BorrowActions — stale price disables writes (U9)', () => {
  // U9 scenario 2: the write button is disabled and its *accessible description*
  // resolves to the reason text — through aria-describedby, not a title tooltip a
  // disabled button would swallow.
  it('disables the borrow button and links the reason via aria-describedby', () => {
    render(<BorrowActions market={staleMarket} hasCollateral />, {
      wrapper: QueryWrapper,
    })
    const btn = borrowButton()
    expect(btn.disabled).toBe(true)
    expect(btn.hasAttribute('title')).toBe(false)

    const describedBy = btn.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const reason = document.getElementById(describedBy!)
    expect(reason?.textContent).toBe(STALE_PRICE_REASON)
  })

  // U9 scenario 3: two stale pools each point at their *own* reason element, so
  // the linkage survives many disabled buttons on one screen.
  it('gives two disabled buttons distinct, self-resolving reasons', () => {
    const second: MarketView = {
      ...MOCK_MARKETS[1],
      priceStale: true,
      priceUsd: undefined,
    }
    render(
      <>
        <BorrowActions market={staleMarket} hasCollateral />
        <BorrowActions market={second} hasCollateral />
      </>,
      { wrapper: QueryWrapper },
    )
    const buttons = screen.getAllByRole('button', { name: /^Borrow$/ })
    expect(buttons).toHaveLength(2)

    const [idA, idB] = buttons.map((b) => b.getAttribute('aria-describedby'))
    expect(idA).toBeTruthy()
    expect(idB).toBeTruthy()
    // Distinct ids — no button borrows another's reason.
    expect(idA).not.toBe(idB)
    // Each id resolves to its own reason element.
    expect(document.getElementById(idA!)?.textContent).toBe(STALE_PRICE_REASON)
    expect(document.getElementById(idB!)?.textContent).toBe(STALE_PRICE_REASON)
  })

  // U9 scenario 4: when the feed recovers on a refetch, the button re-enables with
  // no remount — the same DOM node, and the typed amount survives (proving no
  // remount), with the reason gone.
  it('re-enables the same button node on recovery, without remounting', () => {
    const { rerender } = render(
      <BorrowActions market={staleMarket} hasCollateral />,
      { wrapper: QueryWrapper },
    )
    // Type an amount so a healthy pool would enable the button.
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' },
    })
    const before = borrowButton()
    expect(before.disabled).toBe(true)
    expect(before.getAttribute('aria-describedby')).toBeTruthy()

    // The keeper recovers: same market, price now available.
    rerender(
      <BorrowActions market={{ ...market, priceStale: false }} hasCollateral />,
    )
    const after = borrowButton()
    // Same DOM node — not a remount.
    expect(after).toBe(before)
    // The typed value survived (further proof the panel was not remounted).
    expect(screen.getByDisplayValue('100')).toBeTruthy()
    // Re-enabled, reason gone.
    expect(after.disabled).toBe(false)
    expect(after.getAttribute('aria-describedby')).toBeNull()
  })

  // U9 scenario 6 (button half): a healthy pool's write button carries no reason
  // and enables once an amount is entered.
  it('leaves the borrow button enabled and reason-free on a healthy pool', () => {
    render(<BorrowActions market={market} hasCollateral />, {
      wrapper: QueryWrapper,
    })
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' },
    })
    const btn = borrowButton()
    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-describedby')).toBeNull()
  })
})
