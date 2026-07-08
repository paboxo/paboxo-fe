// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectedHealth } from './ProjectedHealth'

describe('ProjectedHealth', () => {
  it('recolors toward the projected zone and surfaces a remedy when leaving Safe', () => {
    const { container } = render(
      <ProjectedHealth currentHf={2.41} projectedHf={1.35} />,
    )
    expect(
      container.querySelector('[data-projected-zone="comfortable"]'),
    ).toBeNull()
    expect(
      container.querySelector('[data-projected-zone="watch"]'),
    ).toBeTruthy()
    expect(screen.getByText(/Add collateral or repay/)).toBeTruthy()
  })

  it('shows no remedy when the projection stays Safe', () => {
    render(<ProjectedHealth currentHf={2.41} projectedHf={2.1} />)
    expect(screen.queryByText(/Add collateral or repay/)).toBeNull()
  })
})
