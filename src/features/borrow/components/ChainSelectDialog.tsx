import { BASE, HASHKEY } from '#/lib/contracts'
import { Dialog } from '#/components/ui/Dialog'

/** Where the borrowed pxUSDT is delivered. HashKey = same-chain; Base = cross-chain (R1, R2). */
export type Destination = 'hashkey' | 'base'

export const DESTINATION_LABEL: Record<Destination, string> = {
  hashkey: HASHKEY.name,
  base: BASE.name,
}

export interface ChainSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: Destination
  onSelect: (destination: Destination) => void
  /** When false, the Base row is disabled with a caption (rail off — R2). */
  baseEnabled: boolean
}

interface Row {
  dest: Destination
  label: string
  subtitle: string
  disabled: boolean
}

/** Destination-chain picker for a borrow — each row is a chain the funds can land on. */
export function ChainSelectDialog({
  open,
  onOpenChange,
  selected,
  onSelect,
  baseEnabled,
}: ChainSelectDialogProps) {
  const pick = (dest: Destination) => {
    onSelect(dest)
    onOpenChange(false)
  }

  const rows: Row[] = [
    {
      dest: 'hashkey',
      label: HASHKEY.name,
      subtitle: 'Receive on HashKey (same chain)',
      disabled: false,
    },
    {
      dest: 'base',
      label: BASE.name,
      subtitle: baseEnabled
        ? 'Bridge the borrow to Base'
        : 'Cross-chain borrow unavailable',
      disabled: !baseEnabled,
    },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Receive on"
      description="Pick the chain the borrowed pxUSDT is delivered on."
    >
      <ul className="flex flex-col gap-1 p-3">
        {rows.map((row) => {
          const isSelected = row.dest === selected
          return (
            <li key={row.dest}>
              <button
                type="button"
                disabled={row.disabled}
                aria-pressed={isSelected}
                onClick={() => pick(row.dest)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors enabled:hover:bg-[var(--chip-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected ? 'bg-[var(--chip-bg)]' : ''
                }`}
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-[var(--sea-ink)]">
                    {row.label}
                  </span>
                  <span className="text-[0.72rem] text-[var(--sea-ink-soft)]">
                    {row.subtitle}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
