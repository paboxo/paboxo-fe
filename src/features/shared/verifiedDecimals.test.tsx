/**
 * U14 / R31 — the verified decimals must reach `parseUnits`, not the registry
 * constant. Without this, R8 blocks the pool list while the write forms keep
 * sending amounts scaled by an unverified number.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TOKENS } from '#/lib/contracts'
import { QueryWrapper } from '#/test/utils'
import type { MarketView } from '#/features/markets/types'

const borrow = vi.fn()
const repay = vi.fn()
const createPool = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1111111111111111111111111111111111111111',
    chainId: 177,
    isConnected: true,
  }),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

vi.mock('#/features/borrow/hooks/useBorrow', () => ({
  useBorrow: () => ({ state: 'idle', revert: undefined, borrow }),
}))
vi.mock('#/features/repay/hooks/useRepay', () => ({
  useRepay: () => ({ state: 'idle', revert: undefined, repay }),
}))
vi.mock('#/features/supply/hooks/useSupplyLiquidity', () => ({
  useSupplyLiquidity: () => ({
    state: 'idle',
    revert: undefined,
    supply: vi.fn(),
  }),
}))
vi.mock('#/features/withdraw/hooks/useWithdraw', () => ({
  useWithdraw: () => ({
    state: 'idle',
    revert: undefined,
    withdrawLiquidity: vi.fn(),
  }),
}))
vi.mock('#/features/shared/useTokenBalances', () => ({
  useTokenBalance: () => ({ balance: 10_000_000_000n }),
}))
vi.mock('#/features/position/hooks/usePosition', () => ({
  useMarketPosition: () => ({ data: { supplies: [] } }),
}))

const { BorrowPanel } = await import(
  '#/features/borrow/components/BorrowPanel'
)
const { RepayPanel } = await import('#/features/repay/components/RepayPanel')

/** pxUSDT is 6dp. A market whose verified borrow decimals say so. */
function market(borrowDecimals: number): MarketView {
  return {
    id: '0xb45693e9f28ceb47fc3c81b45535e3d808196406',
    poolAddress: '0xb45693e9f28ceb47fc3c81b45535e3d808196406',
    collateralSymbol: 'pxWHSK',
    collateralAddress: TOKENS.pxWHSK.address,
    collateralDecimals: 18,
    borrowSymbol: 'pxUSDT',
    borrowAddress: TOKENS.pxUSDT.address,
    borrowDecimals,
    supplyApy: 4,
    borrowApr: 7,
    utilization: 50,
    tvlUsd: 100_000,
    availableLiquidityUsd: 50_000,
    priceUsd: 0.08,
    totalSupplyAssets: 100_000_000_000n,
    totalBorrowAssets: 50_000_000_000n,
    priceStale: false,
    sizeKnown: true,
    lltv: 70,
    liqThreshold: 75,
    oracle: 'TokenDataStream · pxWHSK/USD',
    crossChain: false,
  }
}

async function typeAmountAndSubmit(label: RegExp, amount: string) {
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }))
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('write forms use the verified borrow decimals', () => {
  it('borrow submits 1.5 pxUSDT as 1500000 when the verified value is 6', async () => {
    render(<BorrowPanel market={market(6)} />, { wrapper: QueryWrapper })
    await typeAmountAndSubmit(/borrow/i, '1.5')
    await waitFor(() => expect(borrow).toHaveBeenCalledWith(1_500_000n))
  })

  it('repay submits 1.5 pxUSDT as 1500000 when the verified value is 6', async () => {
    render(<RepayPanel market={market(6)} />, { wrapper: QueryWrapper })
    await typeAmountAndSubmit(/repay/i, '1.5')
    await waitFor(() => expect(repay).toHaveBeenCalledWith(1_500_000n))
  })

  it('scales by the market value, not the hardcoded registry constant', async () => {
    // If a panel read TOKENS.pxUSDT.decimals (6) it would submit 1_500_000n.
    // Reading the market's verified value (18) must submit 1.5e18 instead.
    render(<BorrowPanel market={market(18)} />, { wrapper: QueryWrapper })
    await typeAmountAndSubmit(/borrow/i, '1.5')
    await waitFor(() =>
      expect(borrow).toHaveBeenCalledWith(1_500_000_000_000_000_000n),
    )
    expect(borrow).not.toHaveBeenCalledWith(1_500_000n)
  })
})

describe('CreatePoolPanel has no market, so it verifies decimals itself', () => {
  async function renderCreatePool(decimals: number | undefined, isLoading = false) {
    vi.doMock('#/features/shared/useTokenDecimals', () => ({
      useTokenDecimals: () => ({ decimals, isLoading, error: null }),
    }))
    vi.doMock('#/features/pool-create/hooks/useCreatePool', () => ({
      useCreatePool: () => ({ state: 'idle', createPool }),
    }))
    vi.resetModules()
    const { CreatePoolPanel } = await import(
      '#/features/pool-create/components/CreatePoolPanel'
    )
    return render(<CreatePoolPanel minSeed={1000} />, { wrapper: QueryWrapper })
  }

  async function fillAndConfirm(seed: string) {
    fireEvent.change(screen.getByLabelText('Seed liquidity'), {
      target: { value: seed },
    })
    fireEvent.click(screen.getByRole('checkbox'))
  }

  it('seeds with the verified value when decimals() resolves', async () => {
    await renderCreatePool(6)
    await fillAndConfirm('1000')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /create pool/i }))
    })
    await waitFor(() => expect(createPool).toHaveBeenCalled())
    expect(createPool.mock.calls[0][0].seedAmount).toBe(1_000_000_000n)
  })

  it('blocks submission and explains why when decimals() cannot be read', async () => {
    await renderCreatePool(undefined)
    await fillAndConfirm('1000')
    expect(screen.getByRole('alert').textContent).toMatch(
      /could not verify pxusdt decimals/i,
    )
    const button = screen.getByRole('button', { name: /create pool/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(button.getAttribute('aria-describedby')).toBe(
      'seed-decimals-unverified',
    )
    expect(createPool).not.toHaveBeenCalled()
  })

  it('blocks submission while the decimals read is still in flight', async () => {
    await renderCreatePool(undefined, true)
    await fillAndConfirm('1000')
    const button = screen.getByRole('button', { name: /create pool/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    // Still loading is not the same as unverifiable — no alarm yet.
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('no write form parses an amount with a registry constant', () => {
  const PANELS = [
    'src/features/supply/components/SupplyLiquidityPanel.tsx',
    'src/features/borrow/components/BorrowPanel.tsx',
    'src/features/repay/components/RepayPanel.tsx',
    'src/features/pool-create/components/CreatePoolPanel.tsx',
  ]

  it.each(PANELS)('%s never reads decimals from the registry constant', async (path) => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(path, 'utf8')
    // `TOKENS.pxUSDT.address` stays fine — an address is deployment config.
    // `TOKENS.pxUSDT.decimals` is the unverified number R8 exists to distrust.
    expect(source).not.toMatch(/TOKENS\.\w+\.decimals/)
  })
})
