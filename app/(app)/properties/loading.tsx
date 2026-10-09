import { Skeleton } from "@/components/ui/skeleton";

// Mesmo esqueleto que a página mostra enquanto busca os imóveis.
export default function PropertiesLoading() {
  return (
    <div className="p-3 md:p-4">
      <div className="space-y-5 rounded-[22px] bg-[var(--bg-secondary)] p-3 sm:space-y-6 sm:rounded-[26px] sm:p-5 lg:p-6 dark:bg-[var(--bg-card)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full max-w-xl rounded-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] lg:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[20px] border border-border/50">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
