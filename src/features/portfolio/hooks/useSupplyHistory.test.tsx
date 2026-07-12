// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { mockIndexerAdapter } from '#/lib/data/indexer/indexerAdapter.mock'
import type { MarketView } from '#/features/markets/types'
import { SupplyHistoryChart } from '../components/SupplyHistoryChart'
import { useSupplyHistory } from './useSupplyHistory'

// No wallet connected → the hook falls back to the preview address.
vi.mock('wagmi', () => ({ useAccount: vi.fn(() => ({ address: undefined })) }))

const POOL = '0x0000000000000000000000000000000000000001' as const
const market = { poolAddress: POOL } as unknown as MarketView

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSupplyHistory', () => {
  it('returns a daily-bucketed series from the mock indexer (R5, R6)', async () => {
    const { result } = renderHook(() => useSupplyHistory(POOL), {
      wrapper: QueryWrapper,
    })

    await waitFor(() => expect(result.current.data.length).toBeGreaterThan(1))

    const { data } = result.current
    // One point per day: consecutive timestamps are exactly 86400s apart.
    const gaps = data.slice(1).map((p, i) => p.timestamp - data[i].timestamp)
    expect(gaps.every((g) => g === 86_400)).toBe(true)
  })
})

describe('SupplyHistoryChart', () => {
  it('renders the chart (not an empty state) when the mock series is present', async () => {
    render(<SupplyHistoryChart market={market} />, { wrapper: QueryWrapper })

    expect(await screen.findByText('Supply over time')).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByText('No supply history yet')).toBeNull(),
    )
  })

  it('shows the empty state when there is no recorded history', async () => {
    vi.spyOn(mockIndexerAdapter, 'getUserSupplyHistory').mockResolvedValue([])

    render(<SupplyHistoryChart market={market} />, { wrapper: QueryWrapper })

    expect(await screen.findByText('No supply history yet')).toBeTruthy()
  })

  it('shows a distinct unavailable state when the indexer read fails', async () => {
    vi.spyOn(mockIndexerAdapter, 'getUserSupplyHistory').mockRejectedValue(
      new Error('indexer down'),
    )

    render(<SupplyHistoryChart market={market} />, { wrapper: QueryWrapper })

    expect(await screen.findByText("Couldn't load supply history")).toBeTruthy()
    expect(screen.queryByText('No supply history yet')).toBeNull()
  })
})
