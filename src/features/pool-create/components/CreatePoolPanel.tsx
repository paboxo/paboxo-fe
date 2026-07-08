import { useState } from 'react'
import { ActionButton } from '#/components/ui/ActionButton'

/**
 * Create a lending pool (U16, R7, R30). Advanced-gated; the below-minimum seed
 * is blocked before submit, and deploy carries a deliberate acknowledgement.
 */
export function CreatePoolPanel({ minSeed = 1000 }: { minSeed?: number }) {
  const [collateral, setCollateral] = useState('pxWHSK')
  const [seed, setSeed] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const seedNum = seed === '' ? 0 : Number(seed)
  const belowMin = seedNum < minSeed
  const showMinError = seed !== '' && belowMin

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
          onChange={(event) => setCollateral(event.target.value)}
          className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-sm text-[var(--sea-ink)]"
        >
          <option>pxWHSK</option>
          <option>pxWBTC</option>
          <option>pxWETH</option>
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
        state="idle"
        idleLabel="Create pool"
        disabled={belowMin || !confirmed}
      />
    </div>
  )
}
