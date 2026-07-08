import { useState } from 'react'
import { parseUnits } from 'viem'
import { ActionButton } from '#/components/ui/ActionButton'
import { TOKENS } from '#/lib/contracts'
import type { TokenSymbol } from '#/lib/contracts'
import { WAD } from '#/lib/math'
import { useCreatePool } from '../hooks/useCreatePool'

const COLLATERAL_OPTIONS: Exclude<TokenSymbol, 'pxUSDT'>[] = [
  'pxWHSK',
  'pxWBTC',
  'pxWETH',
]

/**
 * Create a lending pool (U15, R25). The below-minimum seed is blocked before
 * submit; deploy carries a deliberate acknowledgement and seeds via the Factory.
 */
export function CreatePoolPanel({ minSeed = 1000 }: { minSeed?: number }) {
  const { state, createPool } = useCreatePool()
  const [collateral, setCollateral] = useState<
    Exclude<TokenSymbol, 'pxUSDT'>
  >('pxWHSK')
  const [seed, setSeed] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const seedNum = seed === '' ? 0 : Number(seed)
  const belowMin = seedNum < minSeed
  const showMinError = seed !== '' && belowMin

  const onCreate = () => {
    void createPool({
      collateralToken: TOKENS[collateral].address,
      seedAmount: parseUnits(seed || '0', TOKENS.pxUSDT.decimals),
      minSeed: parseUnits(String(minSeed), TOKENS.pxUSDT.decimals),
      // Default LTV for a new market; a full form would collect this.
      ltv: (70n * WAD) / 100n,
    })
  }

  return (
    <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
      <h3 className="display-title m-0 text-base font-semibold">
        Create a lending pool
      </h3>
      <p className="m-0 text-sm text-[var(--sea-ink-soft)]">
        You’re creating a market others will use. Seed it with initial liquidity
        at or above the minimum.
      </p>

      <label className="flex flex-col gap-1 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Collateral asset
        <select
          value={collateral}
          onChange={(event) =>
            setCollateral(event.target.value as Exclude<TokenSymbol, 'pxUSDT'>)
          }
          className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-sm text-[var(--sea-ink)]"
        >
          {COLLATERAL_OPTIONS.map((symbol) => (
            <option key={symbol}>{symbol}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[0.78rem] text-[var(--sea-ink-soft)]">
        Seed liquidity (pxUSDT)
        <input
          aria-label="Seed liquidity"
          inputMode="decimal"
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          placeholder={`min ${minSeed}`}
          className="num rounded-xl border px-3 py-2 text-sm text-[var(--sea-ink)]"
          style={{
            borderColor: showMinError ? 'var(--danger)' : 'var(--line)',
          }}
        />
      </label>
      {showMinError ? (
        <p
          className="m-0 text-[0.78rem]"
          role="alert"
          style={{ color: 'var(--danger)' }}
        >
          Seed must be at least {minSeed} pxUSDT.
        </p>
      ) : null}

      <label className="flex items-start gap-2 text-[0.8rem] text-[var(--sea-ink)]">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I understand I’m deploying a market others can use.
      </label>

      <ActionButton
        state={state}
        idleLabel="Create pool"
        disabled={belowMin || !confirmed}
        onClick={onCreate}
      />
    </div>
  )
}
