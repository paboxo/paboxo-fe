import { useCallback, useEffect, useRef, useState } from 'react'
import { useMarkets } from '#/features/markets/hooks/useMarkets'
import { ShieldIcon } from '#/components/icons/ShieldIcon'
import type { MarketView } from '#/features/markets/types'
import { useAgentProtection } from '../hooks/useAgentProtection'

type PoolProgress = 'pending' | 'done' | 'error'

type EnableFn = () => Promise<boolean>

/**
 * Headless per-pool controller. A protection hook can't run inside a loop, so
 * each pool gets its own controller. It reports the pool's `active` status up as
 * reactive state (drives the label/disabled) and writes its `enable` into a ref
 * fired imperatively — `enable`'s identity changes each render, so keeping it
 * out of state avoids a render loop. Renders nothing.
 */
function PoolProtectionController({
  market,
  onActive,
  enableRef,
}: {
  market: MarketView
  onActive: (id: string, active: boolean) => void
  enableRef: React.RefObject<Map<string, EnableFn>>
}) {
  const { active, enable } = useAgentProtection(market)
  enableRef.current.set(market.id, enable)
  useEffect(() => {
    onActive(market.id, active)
  }, [market.id, active, onActive])
  return null
}

const PROGRESS_LABEL: Record<PoolProgress, string> = {
  pending: 'Protecting…',
  done: 'Protected',
  error: 'Failed',
}

const PROGRESS_COLOR: Record<PoolProgress, string> = {
  pending: 'var(--sea-ink-soft)',
  done: 'var(--safe)',
  error: 'var(--danger)',
}

/**
 * "Protect all" (R8, AE4). Enables free protection across every pool the user
 * isn't already protecting, firing ONE delegation write per pool sequentially
 * (no batched multicall — KTD6), with per-pool progress and a mixed end state
 * so a single failure is visible rather than silently rolling back the rest.
 */
export function ProtectAllButton() {
  const { data: markets } = useMarkets()
  const enableRef = useRef<Map<string, EnableFn>>(new Map())
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState<Record<string, PoolProgress>>({})
  const [running, setRunning] = useState(false)

  const onActive = useCallback((id: string, active: boolean) => {
    setActiveMap((prev) =>
      prev[id] === active ? prev : { ...prev, [id]: active },
    )
  }, [])

  const marketList = markets
  const reported = marketList.filter((m) => m.id in activeMap)
  const unprotected = reported.filter((m) => !activeMap[m.id])
  const allProtected = reported.length > 0 && unprotected.length === 0

  const protectAll = useCallback(async () => {
    const targets = markets.filter((m) => activeMap[m.id] === false)
    if (targets.length === 0) return
    setRunning(true)
    // Fresh run — every target starts pending, clearing any prior outcome.
    setProgress(
      Object.fromEntries(targets.map((m) => [m.id, 'pending' as const])),
    )
    for (const market of targets) {
      const enable = enableRef.current.get(market.id)
      try {
        const ok = enable ? await enable() : false
        setProgress((prev) => ({ ...prev, [market.id]: ok ? 'done' : 'error' }))
      } catch {
        setProgress((prev) => ({ ...prev, [market.id]: 'error' }))
      }
    }
    setRunning(false)
  }, [markets, activeMap])

  const failed = Object.values(progress).some((s) => s === 'error')

  return (
    <section className="island-shell flex flex-col gap-3 rounded-2xl p-5">
      {marketList.map((market) => (
        <PoolProtectionController
          key={market.id}
          market={market}
          onActive={onActive}
          enableRef={enableRef}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="display-title m-0 text-base font-semibold">
            Agent protection
          </h3>
          <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
            {allProtected
              ? 'All your pools are protected.'
              : `${unprotected.length} pool${unprotected.length === 1 ? '' : 's'} not yet protected.`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void protectAll()}
          disabled={running || unprotected.length === 0}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-[#f3faf5] no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: 'var(--palm)' }}
        >
          {running ? 'Protecting…' : 'Protect all'}
        </button>
      </div>

      {Object.keys(progress).length > 0 ? (
        <ul className="m-0 flex flex-col gap-1 p-0">
          {marketList
            .filter((m) => m.id in progress)
            .map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between text-[0.78rem]"
              >
                <span className="text-[var(--sea-ink)]">
                  {m.collateralSymbol} / {m.borrowSymbol}
                </span>
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: PROGRESS_COLOR[progress[m.id]] }}
                >
                  {progress[m.id] === 'done' ? <ShieldIcon size={13} /> : null}
                  {PROGRESS_LABEL[progress[m.id]]}
                </span>
              </li>
            ))}
        </ul>
      ) : null}

      {failed && !running ? (
        <p
          className="m-0 text-[0.75rem] font-semibold"
          style={{ color: 'var(--danger)' }}
        >
          Some pools couldn’t be protected. You can retry the ones that failed.
        </p>
      ) : null}
    </section>
  )
}
