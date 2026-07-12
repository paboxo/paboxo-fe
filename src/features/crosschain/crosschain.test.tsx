import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrossChainTracker } from '#/components/ui/CrossChainTracker'
import type { CrossChainTransfer } from '#/components/ui/CrossChainTracker'
import { loadTransfer, saveTransfer } from './useCrossChainTransfer'

const base: CrossChainTransfer = {
  id: 'xfer-1',
  sourceChain: 'HashKey',
  destChain: 'Base',
  amount: '100',
  symbol: 'pxUSDT',
  ccipUrl: 'https://ccip.chain.link/tx/0xabc',
}

describe('CrossChainTracker', () => {
  it('shows a success state with the amount and destination', () => {
    render(<CrossChainTracker transfer={base} />)
    expect(
      screen.getByRole('group', { name: 'Cross-chain transfer' }),
    ).toBeTruthy()
    expect(screen.getByText('100 pxUSDT → Base')).toBeTruthy()
    expect(screen.getByText(/arriving on Base/i)).toBeTruthy()
  })

  it('links the CCIP explorer when a ccipUrl is set, omits it otherwise', () => {
    const { rerender } = render(<CrossChainTracker transfer={base} />)
    expect(
      screen.getByRole('link', { name: /Track on CCIP/ }).getAttribute('href'),
    ).toBe('https://ccip.chain.link/tx/0xabc')

    rerender(<CrossChainTracker transfer={{ ...base, ccipUrl: undefined }} />)
    expect(screen.queryByRole('link', { name: /Track on CCIP/ })).toBeNull()
  })
})

describe('cross-chain persistence', () => {
  it('persists and restores an in-flight transfer', () => {
    saveTransfer('supply', base)
    expect(loadTransfer('supply')?.id).toBe('xfer-1')
    saveTransfer('supply', null)
    expect(loadTransfer('supply')).toBeNull()
  })
})
