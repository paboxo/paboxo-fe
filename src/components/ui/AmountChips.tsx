const FRACTIONS = [0.25, 0.5, 0.75] as const

/** Quick-fill chips (U6, R19). The Max chip label is injected so it can say why (gas reserved, safe cap). */
export function AmountChips({
  onQuickFill,
  onMax,
  maxLabel = 'Max',
}: {
  onQuickFill: (fraction: number) => void
  onMax: () => void
  maxLabel?: string
}) {
  return (
    <div className="inline-flex gap-1" role="group" aria-label="Quick fill">
      {FRACTIONS.map((fraction) => (
        <button
          key={fraction}
          type="button"
          onClick={() => onQuickFill(fraction)}
          className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[0.72rem] font-bold text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
        >
          {fraction * 100}%
        </button>
      ))}
      <button
        type="button"
        onClick={onMax}
        className="rounded-full px-2 py-0.5 text-[0.72rem] font-bold"
        style={{ background: 'var(--safe-soft)', color: 'var(--palm)' }}
      >
        {maxLabel}
      </button>
    </div>
  )
}
