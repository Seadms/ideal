// Display-size page header: bold title with a ghosted companion word behind a
// thin slash, echoing the app's reference aesthetic. The ghost is decorative.
export function PageHeader({ title, ghost, sub }: {
  title: string
  ghost?: string
  sub?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 overflow-hidden">
        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-100 whitespace-nowrap">
          {title}
        </h1>
        {ghost && (
          <span aria-hidden className="flex min-w-0 items-center gap-3">
            <span className="h-7 w-px shrink-0 rotate-[20deg] bg-zinc-700" />
            <span className="select-none truncate font-display text-3xl font-bold tracking-tight text-zinc-800">
              {ghost}
            </span>
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
