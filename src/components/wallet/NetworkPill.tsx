import { HASHKEY } from '#/lib/contracts'

/**
 * Static network indicator (U11): a status dot + the active chain name. The app
 * is single-chain (HashKey), so this is not wallet-gated and renders on the
 * server too. Collapses below `sm` to keep the phone header uncluttered.
 */
export function NetworkPill() {
  return (
    <span className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] sm:inline-flex">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: 'var(--palm)' }}
        aria-hidden="true"
      />
      {HASHKEY.name}
    </span>
  )
}
