/** Skeleton primitive (U7, R24). Warm shimmer that mirrors final geometry so nothing reflows. */
export function Skeleton({
  className = '',
  width,
  height = '1rem',
}: {
  className?: string
  width?: string
  height?: string
}) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-md ${className}`}
      style={{
        width,
        height,
        background:
          'color-mix(in oklab, var(--sand) 55%, var(--sea-ink-soft) 14%)',
      }}
      aria-hidden="true"
    />
  )
}

/** A loading placeholder that matches a card/row's shape (U7, R24). */
export function LoadingCard({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="island-shell flex flex-col gap-3 rounded-2xl p-4"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton width="40%" height="1.1rem" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} width={`${90 - index * 12}%`} />
      ))}
    </div>
  )
}
