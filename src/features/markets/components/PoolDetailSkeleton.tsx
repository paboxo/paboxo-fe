import { Skeleton } from '#/components/ui/states/Loading'

/**
 * Loading placeholder shaped like the real pool-detail page (U7, R24): the same
 * two-column grid, identity card + stat strip + two chart cards on the left, and
 * the action card on the right — so nothing reflows when the data resolves.
 */
export function PoolDetailSkeleton() {
  return (
    <div
      className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"
      role="status"
      aria-busy="true"
      aria-label="Loading pool"
    >
      {/* Left column */}
      <div className="flex flex-col gap-5">
        {/* Identity card + stat strip */}
        <section className="island-shell flex flex-col gap-4 rounded-2xl p-5">
          <Skeleton width="2.4rem" height="2.4rem" className="rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton width="55%" height="1.5rem" />
            <Skeleton width="70%" height="0.85rem" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton width="70%" height="0.6rem" />
                <Skeleton width="90%" height="1rem" />
              </div>
            ))}
          </div>
        </section>

        {/* Interest rate model + Rate history chart cards */}
        {[264, 220].map((h, i) => (
          <section
            key={i}
            className="island-shell flex flex-col gap-3 rounded-2xl p-5"
          >
            <Skeleton width="40%" height="1.1rem" />
            <Skeleton height={`${h}px`} className="rounded-xl" />
          </section>
        ))}
      </div>

      {/* Right column — action card */}
      <aside className="h-fit lg:sticky lg:top-20">
        <div className="island-shell flex flex-col gap-3 rounded-2xl p-4">
          {/* Tab strip */}
          <Skeleton height="2.25rem" className="rounded-full" />
          {/* Header */}
          <Skeleton width="45%" height="1.1rem" />
          {/* Balance line */}
          <Skeleton width="60%" height="0.8rem" />
          {/* Amount input */}
          <Skeleton height="3rem" className="rounded-xl" />
          {/* Slider */}
          <Skeleton height="1.5rem" />
          {/* Submit button */}
          <Skeleton height="2.75rem" className="rounded-xl" />
        </div>
      </aside>
    </div>
  )
}
