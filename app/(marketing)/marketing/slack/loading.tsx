export default function SlackConfigLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-52 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-4 w-64 bg-muted/60 rounded" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-3 flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-56 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted/60 rounded" />
            </div>
            <div className="h-5 w-20 bg-muted/60 rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="h-4 w-80 bg-muted/60 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted/60 rounded" />
            </div>
            <div className="h-9 w-40 bg-muted rounded-lg" />
            <div className="h-9 w-9 bg-muted rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
