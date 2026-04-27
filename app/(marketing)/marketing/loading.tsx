export default function MarketingLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded" />
      </div>

      {/* Filters row */}
      <div className="flex gap-3 flex-wrap">
        <div className="h-9 w-44 bg-muted rounded-lg" />
        <div className="h-9 w-36 bg-muted rounded-lg" />
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-7 w-28 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted/40 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="h-4 w-40 bg-muted rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2 border-t border-border/50">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-4 w-16 bg-muted/60 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
