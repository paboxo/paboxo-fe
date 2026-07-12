// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryWrapper } from '#/test/utils'
import * as activityMock from '../agent/activity.mock'
import { AgentActivityFeed } from './AgentActivityFeed'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AgentActivityFeed (AE5)', () => {
  it('renders mock actions with their reasoning under a preview badge', async () => {
    render(<AgentActivityFeed />, { wrapper: QueryWrapper })

    expect(screen.getByText('Preview')).toBeTruthy()
    expect(await screen.findByText(/Rotated 500 pxWHSK/)).toBeTruthy()
  })

  it('reads a dry-run as a simulation (not a failure) and links a sent action', async () => {
    render(<AgentActivityFeed />, { wrapper: QueryWrapper })

    // dry-run → "Simulation", and nothing is mislabelled "Failed".
    expect(await screen.findByText('Simulation')).toBeTruthy()
    expect(screen.queryByText('Failed')).toBeNull()

    // The sent action deep-links to the explorer.
    const link = screen.getByRole('link', { name: 'View transaction' })
    expect(link.getAttribute('href')).toMatch(/explorer\.hsk\.xyz\/tx\/0x/)
  })

  it('formats the rotated amount with its token', async () => {
    render(<AgentActivityFeed />, { wrapper: QueryWrapper })

    // The meta row shows the token-formatted rotated amount for the sent action.
    expect(await screen.findByText('500 pxWHSK')).toBeTruthy()
  })

  it('shows an empty state when there is no agent activity', async () => {
    vi.spyOn(activityMock, 'getAgentActions').mockResolvedValue([])

    render(<AgentActivityFeed />, { wrapper: QueryWrapper })

    expect(await screen.findByText('No agent activity yet')).toBeTruthy()
  })
})
