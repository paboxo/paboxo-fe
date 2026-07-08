/**
 * Canonical metric vocabulary (U3, R4). Every surface renders these metrics
 * from the same registry so a given key always carries the same label, slot,
 * and semantic tone — a market row and a dashboard tile never disagree.
 */

export type MetricKey =
  | 'supplyApy'
  | 'netApy'
  | 'borrowApr'
  | 'utilization'
  | 'health'
  | 'tvl'
  | 'price'
  | 'netWorth'
  | 'liquidity'

export type Tone = 'neutral' | 'positive' | 'negative' | 'accent'

export interface MetricSpec {
  label: string
  tone: Tone
}

export const METRICS: Record<MetricKey, MetricSpec> = {
  supplyApy: { label: 'Supply APY', tone: 'positive' },
  netApy: { label: 'Net APY', tone: 'positive' },
  borrowApr: { label: 'Borrow APR', tone: 'neutral' },
  utilization: { label: 'Utilization', tone: 'neutral' },
  health: { label: 'Health', tone: 'neutral' },
  tvl: { label: 'TVL', tone: 'neutral' },
  price: { label: 'Price', tone: 'neutral' },
  netWorth: { label: 'Net worth', tone: 'neutral' },
  liquidity: { label: 'Available', tone: 'neutral' },
}

export const TONE_COLOR: Record<Tone, string> = {
  neutral: 'var(--sea-ink)',
  positive: 'var(--palm)',
  negative: 'var(--danger)',
  accent: 'var(--lagoon-deep)',
}
