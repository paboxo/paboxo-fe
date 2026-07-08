import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { HASHKEY } from '#/lib/contracts'

/**
 * Header network indicator (U20). Shows the connected chain, or a "Wrong
 * network" warning off HashKey 177 — the write guard (U9) enforces the switch;
 * this just surfaces it. Mount-gated so `useAccount` never runs during SSR.
 */
export function NetworkStatus() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { chain } = useAccount()

  // No chain when disconnected or on an unconfigured network — show nothing.
  if (!mounted || !chain) return null

  const onHashKey = chain.id === HASHKEY.id
  return (
    <span
      role="status"
      className="hidden items-center gap-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--sea-ink)] sm:inline-flex"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: onHashKey ? 'var(--palm)' : 'var(--danger)' }}
      />
      {onHashKey ? chain.name : 'Wrong network'}
    </span>
  )
}
