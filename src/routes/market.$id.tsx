import { createFileRoute } from '@tanstack/react-router'
import { AppPageHeader } from '#/components/layout/AppPageHeader'
import { ErrorState } from '#/components/ui/states/ErrorState'
import { useMarket } from '#/features/markets/mock'
import { MarketDetail } from '#/features/markets/components/MarketDetail'

export const Route = createFileRoute('/market/$id')({
  component: MarketDetailPage,
})

function MarketDetailPage() {
  const { id } = Route.useParams()
  const { data } = useMarket(id)
  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <AppPageHeader kicker="Market" title="Market detail" />
      {data ? (
        <MarketDetail market={data} />
      ) : (
        <ErrorState
          title="Market not found"
          message="This market doesn’t exist or hasn’t launched yet."
        />
      )}
    </main>
  )
}
