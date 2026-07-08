import { useId, useState } from 'react'

/**
 * Keyboard-focusable, dismissible tooltip (U18, R30). Wraps a term with a plain
 * definition shown on hover/focus and dismissed with Escape.
 */
export function Tooltip({
  term,
  definition,
}: {
  term: string
  definition: string
}) {
  const id = useId()
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className="inline-flex items-center gap-0.5 border-b border-dotted border-[var(--sea-ink-soft)] text-[var(--sea-ink)]"
      >
        {term}
        <span aria-hidden="true" className="text-[var(--sea-ink-soft)]">
          ⓘ
        </span>
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="island-shell absolute bottom-full left-0 z-10 mb-1 w-56 rounded-lg p-2 text-[0.75rem] font-normal text-[var(--sea-ink)]"
        >
          {definition}
        </span>
      ) : null}
    </span>
  )
}
