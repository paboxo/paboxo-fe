import { createFileRoute, Outlet } from '@tanstack/react-router'

// Layout route for the `/earn` segment. The list lives in `earn.index.tsx`
// (`/earn`) and the per-pool page in `earn.$id.tsx` (`/earn/$id`); this route
// only renders the matched child so the per-pool page isn't masked by the list.
export const Route = createFileRoute('/earn')({ component: () => <Outlet /> })
