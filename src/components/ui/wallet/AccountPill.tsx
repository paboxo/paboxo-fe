export function truncateAddress(address: string): string {
  return address.length > 10
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address
}

/** The connected-account chip (U8, R22): chain identity + truncated address. */
export function AccountPill({
  address,
  chainName,
  onClick,
}: {
  address: string
  chainName?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-[0.82rem] font-semibold text-[var(--sea-ink)]"
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: 'linear-gradient(90deg,#38a8e0,#6cc6f0)' }}
        aria-hidden="true"
      />
      {chainName ? (
        <span className="text-[var(--sea-ink-soft)]">{chainName}</span>
      ) : null}
      <span className="num">{truncateAddress(address)}</span>
    </button>
  )
}
