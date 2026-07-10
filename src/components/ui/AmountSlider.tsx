const MARKERS = [0, 25, 50, 75, 100] as const

export interface AmountSliderProps {
  /** Current fill as a fraction 0..1 of the max, derived from the input. */
  value: number
  /** Called with the chosen fraction (0..1) as the user drags or keys. */
  onChange: (fraction: number) => void
  disabled?: boolean
}

/**
 * Binance-style drag slider (U5, R10): fills the input by fraction of balance,
 * with percentage markers above the track. Keyboard-accessible through the
 * native range input (arrow keys, focus ring); the thumb reflects the current
 * input via `value`.
 */
export function AmountSlider({
  value,
  onChange,
  disabled = false,
}: AmountSliderProps) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div
        className="flex justify-between text-[0.66rem] font-bold text-[var(--sea-ink-soft)]"
        aria-hidden="true"
      >
        {MARKERS.map((marker) => (
          <span key={marker}>{marker}%</span>
        ))}
      </div>
      <input
        type="range"
        className="amount-slider w-full"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        aria-label="Fill amount by percentage of balance"
        aria-valuetext={`${percent}%`}
      />
    </div>
  )
}
