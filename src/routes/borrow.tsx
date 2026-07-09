import { createFileRoute, Outlet } from '@tanstack/react-router'

// Layout route for the `/borrow` segment. The list lives in `borrow.index.tsx`
// (`/borrow`) and the per-pool page in `borrow.$id.tsx` (`/borrow/$id`); this
// route only renders the matched child so the per-pool page isn't masked.
export const Route = createFileRoute('/borrow')({ component: () => <Outlet /> })
