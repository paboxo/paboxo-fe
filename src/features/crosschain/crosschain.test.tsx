import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrossChainTracker } from '#/components/ui/CrossChainTracker'
import type { CrossChainTransfer } from '#/components/ui/CrossChainTracker'
import { loadTransfer, saveTransfer } from './useCrossChainTransfer'

const base: CrossChainTransfer = {
  id: 'xfer-1',
  sourceChain: 'Base',
  destChain: 'HashKey',
  amount: '100',
  symbol: 'pxUSDT',
  step: 'relaying',
  startedAt: 1000,
  etaSeconds: 300,
  sourceTxUrl: '#source',
  destTxUrl: '#dest',
}

describe('CrossChainTracker', () => {
  it('marks the active step and links both ledgers', () => {
    render(<CrossChainTracker transfer={base} nowMs={1000 + 60_000} />)
    const group = screen.getByRole('group', { name: 'Cross-chain transfer' })
    expect(group.getAttribute('data-step')).toBe('relaying')
    expect(screen.getByText('Source tx ↗')).toBeTruthy()
    expect(screen.getByText('Destination tx ↗')).toBeTruthy()
  })

  it('flags overdue once elapsed exceeds the ETA', () => {
    render(
      <CrossChainTracker
        transfer={{ ...base, startedAt: 0, etaSeconds: 60 }}
        nowMs={200_000}
        onCheckStatus={() => {}}
      />,
    )
    expect(screen.getByText(/Taking longer than usual/)).toBeTruthy()
  })
})

describe('cross-chain persistence', () => {
  it('persists and restores an in-flight transfer', () => {
    saveTransfer(base)
    expect(loadTransfer()?.id).toBe('xfer-1')
    saveTransfer(null)
    expect(loadTransfer()).toBeNull()
  })
})
