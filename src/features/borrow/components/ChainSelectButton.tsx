import { ChevronDown } from 'lucide-react'
import type { Destination } from './ChainSelectDialog'
import { DESTINATION_LABEL } from './ChainSelectDialog'

export interface ChainSelectButtonProps {
  destination: Destination
  onClick: () => void
}

/** Trigger for the destination-chain picker — shows the current chain + a chevron. */
export function ChainSelectButton({
  destination,
  onClick,
}: ChainSelectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-bold text-[var(--sea-ink)] transition-colors hover:border-[var(--sea-ink-soft)]"
    >
      <span className="text-[0.72rem] font-normal text-[var(--sea-ink-soft)]">
        Receive on
      </span>
      {DESTINATION_LABEL[destination]}
      <ChevronDown
        size={16}
        className="text-[var(--sea-ink-soft)]"
        aria-hidden="true"
      />
    </button>
  )
}
