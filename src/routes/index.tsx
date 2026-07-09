import { createFileRoute, redirect } from '@tanstack/react-router'

// The app opens straight on the markets plane — no separate landing page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/markets' })
  },
})
