import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatTile } from './StatTile'

// U9 (R9/R27): an em-dash value means the reading was unavailable. The glyph is
// silent to a screen reader, so the tile pairs it with a visually-hidden word.
describe('StatTile', () => {
  it('pairs an em-dash value with a screen-reader "Unavailable"', () => {
    render(<StatTile label="TVL" value="—" />)
    // The em dash still renders visibly.
    expect(screen.getByText('—')).toBeTruthy()
    // …and an audible marker rides alongside it.
    expect(screen.getByText('Unavailable')).toBeTruthy()
  })

  it('adds no unavailable marker for a real value', () => {
    render(<StatTile label="TVL" value="$0.00" />)
    expect(screen.getByText('$0.00')).toBeTruthy()
    expect(screen.queryByText('Unavailable')).toBeNull()
  })
})
