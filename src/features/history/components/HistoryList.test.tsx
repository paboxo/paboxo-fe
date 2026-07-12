// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { HistoryEvent } from '#/lib/data'
import { useHistory } from '../hooks/useHistory'
import { HistoryList } from './HistoryList'

vi.mock('../hooks/useHistory', () => ({ useHistory: vi.fn() }))
const mockUseHistory = vi.mocked(useHistory)

const POOL = '0xB456000000000000000000000000000000006406' as const

function event(i: number): HistoryEvent {
  return {
    id: `evt-${i}`,
    action: 'supply',
    pool: POOL,
    marketId: 'pxwbtc',
    amount: BigInt(i + 1) * 1_000_000n,
    token: '0x4852Bc014401415C4CE4788A04cAB019d1527aAa',
    tokenSymbol: 'pxUSDT',
    decimals: 6,
    timestamp: 1_720_000_000 + i,
    txHash: `0x${String(i).padStart(2, '0').repeat(32)}`,
  }
}

const events = Array.from({ length: 12 }, (_, i) => event(i))

beforeEach(() => {
  mockUseHistory.mockReturnValue({
    data: events,
    isLoading: false,
    error: null,
  })
})

describe('HistoryList', () => {
  it('paginates to 10 rows per page with the pool label and a tx link', () => {
    render(<HistoryList />)

    // 10 of 12 on the first page.
    expect(screen.getAllByText('Supplied').length).toBe(10)
    expect(screen.getByText('Page 1 of 2')).toBeTruthy()

    // Pool label resolved from the market id.
    expect(screen.getAllByText(/pxWBTC \/ pxUSDT/).length).toBeGreaterThan(0)

    // Each row links its tx hash to the explorer.
    const link = screen.getAllByRole('link')[0]
    expect(link.getAttribute('href')).toMatch(/\/tx\/0x/)
  })

  it('advances to the next page and back', () => {
    render(<HistoryList />)

    expect(
      screen.getByRole('button', { name: 'Previous' }).hasAttribute('disabled'),
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Page 2 holds the remaining 2 rows.
    expect(screen.getByText('Page 2 of 2')).toBeTruthy()
    expect(screen.getAllByText('Supplied').length).toBe(2)
    expect(
      screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('shows the empty state with no history', () => {
    mockUseHistory.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<HistoryList />)
    expect(screen.getByText('No activity yet')).toBeTruthy()
  })
})
