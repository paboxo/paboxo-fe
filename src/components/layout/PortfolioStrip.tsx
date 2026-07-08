import { StatTile } from '#/components/ui/StatTile'
import { HealthMeter } from '#/components/ui/HealthMeter'

/**
 * The persistent whole-footprint strip once connected (U9, R9): total supplied,
 * borrowed, blended APY, and aggregate health.
 */
export function PortfolioStrip({
  supplied,
  borrowed,
  netApy,
  healthFactor,
}: {
  supplied: string
  borrowed: string
  netApy: string
  healthFactor: number
}) {
  return (
    <section
      className="island-shell flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl px-5 py-4"
      aria-label="Portfolio summary"
    >
      <StatTile label="Supplied" value={supplied} hero />
      <StatTile label="Borrowed" value={borrowed} />
      <StatTile label="Net APY" value={netApy} tone="positive" />
      <div className="min-w-[190px] flex-1">
        <HealthMeter hf={healthFactor} />
      </div>
    </section>
  )
}
