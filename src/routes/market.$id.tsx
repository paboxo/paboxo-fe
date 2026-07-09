import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { LoadingCard } from '#/components/ui/states/Loading'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { useMarket } from '#/features/markets/hooks/useMarkets'
import { MarketDetail } from '#/features/markets/components/MarketDetail'
import { MarketIrmChart } from '#/features/analytics/components/MarketIrmChart'
import { MarketRateChart } from '#/features/analytics/components/MarketRateChart'

export const Route = createFileRoute('/market/$id')({
  component: MarketDetailPage,
})

function MarketDetailPage() {
  const { id } = Route.useParams()
  const { data, isLoading } = useMarket(id)
  return (
    <main className="page-wrap flex flex-col gap-5 px-4 pb-12 pt-8">
      <AppPageHeader kicker="Market" title="Market detail" />
      {isLoading ? (
        <LoadingCard />
      ) : data ? (
        <>
          <MarketDetail market={data} />
          <MarketIrmChart market={data} />
          <MarketRateChart market={data} />
        </>
      ) : (
        <ErrorState
          title="Market not found"
          message="This market doesn’t exist or hasn’t launched yet."
        />
      )}
    </main>
  )
}
