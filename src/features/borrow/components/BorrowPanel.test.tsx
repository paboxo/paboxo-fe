import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { parseUnits } from 'viem'
import { makeMarket } from '#/features/markets/testFixtures'
import { useBorrow } from '../hooks/useBorrow'
import {
  useCrossChainBorrow,
  useCrossChainBorrowFee,
} from '../hooks/useCrossChainBorrow'
import { useTokenBalance } from '#/features/shared/useTokenBalances'
import { useCrossChainTransfer } from '#/features/crosschain/useCrossChainTransfer'
import { BorrowPanel } from './BorrowPanel'

vi.mock('../hooks/useBorrow', () => ({ useBorrow: vi.fn() }))
vi.mock('../hooks/useCrossChainBorrow', () => ({
  useCrossChainBorrow: vi.fn(),
  useCrossChainBorrowFee: vi.fn(),
}))
vi.mock('#/features/shared/useTokenBalances', () => ({
  useTokenBalance: vi.fn(),
}))
vi.mock('#/features/crosschain/useCrossChainTransfer', () => ({
  useCrossChainTransfer: vi.fn(),
}))

const mockUseBorrow = vi.mocked(useBorrow)
const mockUseCross = vi.mocked(useCrossChainBorrow)
const mockUseFee = vi.mocked(useCrossChainBorrowFee)
const mockUseBalance = vi.mocked(useTokenBalance)
const mockUseTransfer = vi.mocked(useCrossChainTransfer)

const market = makeMarket({ id: '0xaaa' })
let sameBorrow: ReturnType<typeof vi.fn>
let crossBorrow: ReturnType<typeof vi.fn>

const FEE = 500_000_000_000_000n // 0.0005 HSK

beforeEach(() => {
  vi.clearAllMocks()
  sameBorrow = vi.fn()
  crossBorrow = vi.fn()
  mockUseBorrow.mockReturnValue({
    state: 'idle',
    revert: null,
    borrow: sameBorrow,
  } as unknown as ReturnType<typeof useBorrow>)
  mockUseCross.mockReturnValue({
    state: 'idle',
    revert: null,
    borrow: crossBorrow,
    bridgeStatus: 'idle',
    messageId: null,
  } as unknown as ReturnType<typeof useCrossChainBorrow>)
  mockUseFee.mockReturnValue({
    data: FEE,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useCrossChainBorrowFee>)
  mockUseBalance.mockReturnValue({ balance: 0n } as unknown as ReturnType<
    typeof useTokenBalance
  >)
  mockUseTransfer.mockReturnValue({
    transfer: null,
    start: vi.fn(),
    update: vi.fn(),
    clear: vi.fn(),
  })
})

function typeAmount(value: string) {
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value } })
}

// Covers R1, R3, R8.
describe('BorrowPanel', () => {
  it('defaults to HashKey and routes submit to the same-chain borrow', () => {
    render(<BorrowPanel market={market} />)
    expect(screen.getByRole('button', { name: /HashKey/ })).toBeTruthy()
    // No cross-chain fee row on the same-chain path.
    typeAmount('100')
    expect(screen.queryByText('Bridge fee')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Borrow' }))
    expect(sameBorrow).toHaveBeenCalledWith(parseUnits('100', 6))
    expect(crossBorrow).not.toHaveBeenCalled()
  })

  it('routes to the cross-chain borrow and shows the bridge fee when Base is picked', () => {
    render(<BorrowPanel market={market} />)
    // Open the picker and choose Base.
    fireEvent.click(screen.getByRole('button', { name: /HashKey/ }))
    fireEvent.click(screen.getByRole('button', { name: /Base/ }))
    // Trigger now reflects Base.
    expect(screen.getByRole('button', { name: /Base/ })).toBeTruthy()

    typeAmount('100')
    expect(screen.getByText('Bridge fee')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Borrow' }))
    expect(crossBorrow).toHaveBeenCalledWith(parseUnits('100', 6))
    expect(sameBorrow).not.toHaveBeenCalled()
  })

  it('keeps Borrow disabled while the cross-chain fee is loading', () => {
    mockUseFee.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useCrossChainBorrowFee>)
    render(<BorrowPanel market={market} />)
    fireEvent.click(screen.getByRole('button', { name: /HashKey/ }))
    fireEvent.click(screen.getByRole('button', { name: /Base/ }))
    typeAmount('100')
    expect(
      screen.getByRole('button', { name: 'Borrow' }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
