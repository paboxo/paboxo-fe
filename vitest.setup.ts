import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount anything rendered by @testing-library between tests so the jsdom
// document does not leak state across cases.
afterEach(() => {
  cleanup()
})
