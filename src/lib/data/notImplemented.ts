/**
 * A stand-in that satisfies an adapter interface but throws on any call. Used
 * for the `live` adapters until U18/U19 wire the real viem/GraphQL impls, so the
 * registry can select a distinct implementation per `VITE_DATA_MODE` today.
 */
export function notImplemented<T extends object>(label: string): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      // Every adapter member is an async method — reject rather than throw
      // synchronously so callers see a normal rejected promise.
      return () =>
        Promise.reject(
          new Error(
            `${label}: "${String(prop)}" is not wired yet — live mode lands in U18/U19. Use VITE_DATA_MODE=mock.`,
          ),
        )
    },
  })
}
