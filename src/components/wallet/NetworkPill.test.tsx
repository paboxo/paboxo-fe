// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HASHKEY } from '#/lib/contracts'
import { NetworkPill } from './NetworkPill'

describe('NetworkPill', () => {
  it('renders the active chain name with a status dot', () => {
    const { container } = render(<NetworkPill />)
    expect(screen.getByText(HASHKEY.name)).toBeTruthy()
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull()
  })
})
