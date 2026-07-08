import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DensityProvider } from '#/components/density/DensityProvider'
import { QueryWrapper } from '#/test/utils'
import { MarketList } from '#/features/markets/components/MarketList'
import { ProjectedHealth } from './ProjectedHealth'

describe('accessibility & responsive', () => {
  it('keeps a mobile card fallback alongside the Pro table (tables→cards)', async () => {
    window.localStorage.setItem('density', 'pro')
    render(
      <QueryWrapper>
        <DensityProvider>
          <MarketList />
        </DensityProvider>
      </QueryWrapper>,
    )
    expect(await screen.findByRole('table')).toBeTruthy()
    // the sm:hidden card grid is present in the DOM for small screens
    expect(screen.getAllByRole('article').length).toBe(4)
  })

  it('announces projected-health changes via an aria-live status region', () => {
    const { container } = render(
      <ProjectedHealth currentHf={2.41} projectedHf={1.35} />,
    )
    const region = container.querySelector('[aria-live="polite"]')
    expect(region).toBeTruthy()
    expect(region?.getAttribute('role')).toBe('status')
  })
})
