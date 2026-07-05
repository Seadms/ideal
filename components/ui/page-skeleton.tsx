// Instant loading shell shown while a route's server component fetches.
// Mirrors the app's card rhythm so the swap-in doesn't jump.
export function PageSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading" role="status">
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-zinc-900" />
        <div className="h-3 w-64 rounded bg-zinc-900" />
      </div>
      {hero && <div className="h-72 rounded-2xl border border-zinc-900 bg-zinc-900/40" />}
      <div className="h-20 rounded-xl border border-zinc-900 bg-zinc-900/40" />
      <div className="space-y-2">
        <div className="h-16 rounded-xl border border-zinc-900 bg-zinc-900/40" />
        <div className="h-16 rounded-xl border border-zinc-900 bg-zinc-900/40" />
        <div className="h-16 rounded-xl border border-zinc-900 bg-zinc-900/40" />
      </div>
    </div>
  )
}
