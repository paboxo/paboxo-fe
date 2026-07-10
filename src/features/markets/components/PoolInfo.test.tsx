import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import { MOCK_MARKETS } from '../mock'
import { PoolInfo } from './PoolInfo'

const market = MOCK_MARKETS[0] // pxwhsk

function renderPoolInfo(ui: ReactElement) {
  return render(ui, { wrapper: QueryWrapper })
}

// Covers AE3, R4, R9.
describe('PoolInfo', () => {
  it('earn variant leads with Supply APY and still shows the borrow rate', () => {
    renderPoolInfo(<PoolInfo market={market} context="earn" />)
    expect(screen.getByText('Supply APY')).toBeTruthy()
    // Borrow rate stays visible on the Earn variant.
    expect(screen.getByText('Borrow APR')).toBeTruthy()
    // Charts re-homed from the removed market.$id route are present.
    expect(screen.getByText('Interest rate model')).toBeTruthy()
    expect(screen.getByText('Rate history')).toBeTruthy()
  })

  it('borrow variant leads with borrow APR, LLTV, liq-threshold, and health', () => {
    renderPoolInfo(<PoolInfo market={market} context="borrow" health={1.89} />)
    expect(screen.getByText('Borrow APR')).toBeTruthy()
    expect(screen.getByText('LLTV')).toBeTruthy()
    expect(screen.getByText('Liq. threshold')).toBeTruthy()
    // Health comes from the prop (single-pool, via useMarketPosition upstream).
    expect(screen.getByRole('group', { name: /Health/ })).toBeTruthy()
    // Supply APY does not lead the Borrow variant.
    expect(screen.queryByText('Supply APY')).toBeNull()
    // Charts present here too.
    expect(screen.getByText('Interest rate model')).toBeTruthy()
    expect(screen.getByText('Rate history')).toBeTruthy()
  })

  it('renders without crashing when health is missing', () => {
    renderPoolInfo(<PoolInfo market={market} context="borrow" />)
    expect(screen.getByText('Borrow APR')).toBeTruthy()
    // No health meter without a health value.
    expect(screen.queryByRole('group', { name: /Health/ })).toBeNull()
  })

  // U9: the stale badge appears on the detail header, and the price tile em-dashes
  // rather than lying with a zero (R9). A healthy market carries no badge.
  it('shows the stale badge and an em-dash price tile for a stale pool', () => {
    const stale = { ...market, priceStale: true, priceUsd: undefined }
    renderPoolInfo(<PoolInfo market={stale} context="earn" />)
    const badge = screen.getByText('Price stale')
    expect(badge.getAttribute('role')).toBe('status')
    // The price tile renders an em dash paired with a screen-reader word.
    expect(screen.getByText('Unavailable')).toBeTruthy()
  })

  it('shows no stale badge for a healthy pool', () => {
    renderPoolInfo(<PoolInfo market={market} context="earn" />)
    expect(screen.queryByText('Price stale')).toBeNull()
  })
})
