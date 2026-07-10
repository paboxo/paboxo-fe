/**
 * Client-side pagination control (U7, R15). Prev / next plus a page indicator —
 * there is no pagination pattern elsewhere in the codebase, so this establishes
 * one. It hides itself when the result fits a single page, exposes the current
 * page and the total through the indicator's text, and marks the indicator with
 * `aria-current="page"` so assistive tech can find the live position. Page
 * changes are announced by the shell's live region, not here.
 */
export interface PaginationProps {
  /** The active page, 1-based. */
  page: number
  /** Total number of pages (>= 1). */
  pageCount: number
  onPageChange: (page: number) => void
}

const BUTTON_CLASS =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-2 text-[var(--sea-ink)] disabled:opacity-40'

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  // The control hides itself when everything fits one page (R15).
  if (pageCount <= 1) return null

  const atStart = page <= 1
  const atEnd = page >= pageCount

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-center gap-3 text-sm"
    >
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onPageChange(page - 1)}
        disabled={atStart}
        aria-label="Previous page"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span aria-current="page" className="font-semibold text-[var(--sea-ink)]">
        Page {page} of {pageCount}
      </span>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={() => onPageChange(page + 1)}
        disabled={atEnd}
        aria-label="Next page"
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  )
}
