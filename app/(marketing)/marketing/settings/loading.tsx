export default function MarketingSettingsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted/60 rounded" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="h-4 w-full bg-muted/40 rounded" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
      ))}
    </div>
  )
}
