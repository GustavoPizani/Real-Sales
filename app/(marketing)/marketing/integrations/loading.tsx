export default function IntegrationsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted/60 rounded" />
      </div>

      {/* Facebook card skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3 w-52 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-muted rounded-full" />
          ))}
        </div>
      </div>

      {/* Mappings section skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-5 w-44 bg-muted rounded" />
            <div className="h-3 w-64 bg-muted/60 rounded" />
          </div>
          <div className="h-9 w-36 bg-muted rounded-lg" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-6 w-12 bg-muted/60 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-muted/60 rounded-full" />
              <div className="h-5 w-20 bg-muted/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
