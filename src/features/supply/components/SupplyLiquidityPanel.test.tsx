import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useAccount, useSwitchChain } from 'wagmi'
import { QueryWrapper } from '#/test/utils'
import { mockChainAdapter } from '#/lib/data/chain/chainAdapter.mock'
import { MOCK_MARKETS } from '#/features/markets/mock'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import { useMarketPosition } from '#/features/position/hooks/usePosition'
import { SupplyLiquidityPanel } from './SupplyLiquidityPanel'

vi.mock('wagmi', () => ({ useAccount: vi.fn(), useSwitchChain: vi.fn() }))
vi.mock('#/features/shared/useTokenBalances', () => ({
  useTokenBalance: vi.fn(),
}))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: vi.fn(),
}))

const mockUseAccount = vi.mocked(useAccount)
const mockUseSwitchChain = vi.mocked(useSwitchChain)
const mockUseTokenBalance = vi.mocked(useTokenBalance)
const mockUseMarketPosition = vi.mocked(useMarketPosition)
const USER = '0x1111111111111111111111111111111111111111' as const
const market = MOCK_MARKETS[0] // pxwhsk

beforeEach(() => {
  mockUseAccount.mockReturnValue({
    address: USER,
    chainId: 177,
    isConnected: true,
  } as unknown as ReturnType<typeof useAccount>)
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useSwitchChain>)
  // Wallet holds 25,000 pxUSDT (supply cap); the user has supplied 12,500
  // pxUSDT liquidity in this pool (withdraw cap).
  mockUseTokenBalance.mockReturnValue({
    balance: 25_000_000_000n,
    isLoading: false,
    isError: false,
  })
  mockUseMarketPosition.mockReturnValue({
    data: {
      supplies: [
        {
          symbol: 'pxUSDT',
          balance: 12_500_000_000n,
          decimals: 6,
          valueUsd: 12_500,
          apy: 5,
        },
      ],
      borrows: [],
    },
    isLoading: false,
    error: null,
  })
})

function renderPanel() {
  return render(<SupplyLiquidityPanel market={market} />, {
    wrapper: QueryWrapper,
  })
}

function typeAmount(amount: string) {
  fireEvent.change(screen.getByLabelText('Amount'), {
    target: { value: amount },
  })
}

// Covers R6, AE1.
describe('SupplyLiquidityPanel', () => {
  it('offers only pxUSDT liquidity supply/withdraw — never a collateral action', () => {
    renderPanel()
    expect(screen.getAllByText(/pxUSDT/).length).toBeGreaterThan(0)
    // The collateral symbol (pxWHSK) must not appear — liquidity only.
    expect(screen.queryByText(new RegExp(market.collateralSymbol))).toBeNull()
    expect(screen.getByRole('tab', { name: 'Supply' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Withdraw' })).toBeTruthy()
  })

  it("shows the user's supplied balance in this pool", () => {
    renderPanel()
    expect(screen.getByText('Supplied in this pool')).toBeTruthy()
    // 12,500 pxUSDT supplied (amount + USD value both surface it).
    expect(screen.getAllByText(/12,500/).length).toBeGreaterThan(0)
  })

  it('blocks a non-positive amount', () => {
    renderPanel()
    expect(
      screen.getByRole('button', { name: /Supply/ }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('routes a supply through the write wrapper', async () => {
    const supplyLiquidity = vi.spyOn(mockChainAdapter, 'supplyLiquidity')
    renderPanel()
    typeAmount('100')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Supply/ }))
    })
    await waitFor(() => expect(supplyLiquidity).toHaveBeenCalled())
    expect(supplyLiquidity).toHaveBeenCalledWith(
      market.poolAddress,
      USER,
      100_000_000n, // parseUnits('100', 6)
    )
    supplyLiquidity.mockRestore()
  })

  it('submits the withdraw-liquidity path', async () => {
    const withdrawLiquidity = vi.spyOn(mockChainAdapter, 'withdrawLiquidity')
    renderPanel()
    fireEvent.click(screen.getByRole('tab', { name: 'Withdraw' }))
    typeAmount('50')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Withdraw/ }))
    })
    await waitFor(() => expect(withdrawLiquidity).toHaveBeenCalled())
    expect(withdrawLiquidity).toHaveBeenCalledWith(
      market.poolAddress,
      50_000_000n, // parseUnits('50', 6)
      USER,
    )
    withdrawLiquidity.mockRestore()
  })
})
