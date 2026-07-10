import { readFileSync } from 'node:fs'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PX_WHSK, makeMarket } from '#/features/markets/testFixtures'
import type { MarketView } from '#/features/markets/types'
import { usePools } from '#/features/markets/hooks/usePools'
import { BorrowList } from './BorrowList'

vi.mock('#/features/markets/hooks/usePools', () => ({ usePools: vi.fn() }))

const mockUsePools = vi.mocked(usePools)

function setPools(data: MarketView[]): void {
  mockUsePools.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    sharedTokenFailed: false,
  })
}

/** The `/borrow/{id}` targets of each rendered row, in DOM order. */
function borrowLinkHrefs(): string[] {
  return screen
    .getAllByRole('link')
    .map((a) => a.getAttribute('href') ?? '')
    .filter((href) => href.startsWith('/borrow/'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

// Covers R14, R26.
describe('BorrowList', () => {
  it('ranks a smaller pool with free liquidity above a fully-borrowed larger pool', () => {
    // Same fixtures the Earn suite uses: A is bigger but fully borrowed (free 0),
    // B is smaller but has free liquidity (free 50). Borrow ranks by free
    // liquidity, so B leads — the opposite of Earn's order on these fixtures.
    setPools([
      makeMarket({
        id: '0xaaa',
        totalSupplyAssets: 100n,
        totalBorrowAssets: 100n,
      }),
      makeMarket({
        id: '0xbbb',
        totalSupplyAssets: 50n,
        totalBorrowAssets: 0n,
      }),
    ])
    render(<BorrowList />)
    expect(borrowLinkHrefs()).toEqual(['/borrow/0xbbb', '/borrow/0xaaa'])
  })

  it('breaks an identical liquidity signal by ascending pool address', () => {
    setPools([
      makeMarket({
        id: '0xbbb',
        totalSupplyAssets: 100n,
        totalBorrowAssets: 0n,
      }),
      makeMarket({
        id: '0xaaa',
        totalSupplyAssets: 100n,
        totalBorrowAssets: 0n,
      }),
    ])
    render(<BorrowList />)
    expect(borrowLinkHrefs()).toEqual(['/borrow/0xaaa', '/borrow/0xbbb'])
  })

  it('sorts an unknown-size pool below a genuinely zero-liquidity pool', () => {
    setPools([
      makeMarket({
        id: '0xaaa',
        sizeKnown: false,
        totalSupplyAssets: undefined,
        totalBorrowAssets: undefined,
      }),
      makeMarket({
        id: '0xbbb',
        sizeKnown: true,
        totalSupplyAssets: 0n,
        totalBorrowAssets: 0n,
      }),
    ])
    render(<BorrowList />)
    // A known zero-liquidity pool is still knowable; unknown always sinks last.
    expect(borrowLinkHrefs()).toEqual(['/borrow/0xbbb', '/borrow/0xaaa'])
  })

  it('renders a real logo image for a registry token (address reached the glyph)', () => {
    setPools([makeMarket({ id: '0xaaa', collateralAddress: PX_WHSK })])
    const { container } = render(<BorrowList />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('/tokens/whsx.webp')
  })

  it('links each row to its pool address under /borrow', () => {
    setPools([makeMarket({ id: '0xaaa' })])
    render(<BorrowList />)
    expect(borrowLinkHrefs()).toEqual(['/borrow/0xaaa'])
  })

  it('owns no loading, error, or empty markup of its own', () => {
    const source = readFileSync(
      'src/features/borrow/components/BorrowList.tsx',
      'utf8',
    )
    expect(source).not.toMatch(/LoadingCard|ErrorState|EmptyState/)
  })
})
