---
name: vercel-react-best-practices
description: Apply when writing Next.js components, implementing data fetching, reviewing code for performance, or refactoring React/Next.js apps. Covers 8 categories: waterfalls, bundle size, server performance, client fetching, re-renders, rendering, JS performance, advanced patterns.
---

# Vercel React Best Practices

Performance optimization guidelines for React and Next.js applications. Reference when writing new components, implementing data fetching, reviewing code, or optimizing performance.

## CRITICAL: Eliminating Waterfalls

**Rule async-1: Parallelize independent async operations**
```tsx
// ❌ Sequential — each awaits the previous
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)

// ✅ Parallel — all start at the same time
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])
```

**Rule async-2: Move await into branches where actually used**
```tsx
// ❌ Awaits at top even when only used in one branch
async function Page({ id, showComments }) {
  const [data, comments] = await Promise.all([getData(id), getComments(id)])
  return showComments ? <Comments data={comments} /> : <View data={data} />
}

// ✅ Only fetch what's needed
async function Page({ id, showComments }) {
  const dataPromise = getData(id)
  const commentsPromise = showComments ? getComments(id) : null
  const [data, comments] = await Promise.all([dataPromise, commentsPromise])
  ...
}
```

**Rule async-3: Use Suspense for streaming**
Wrap slow components in `<Suspense>` to stream faster parts to the client first.

**Rule async-4: Deduplicate requests with React.cache()**
```tsx
const getUser = React.cache(async (id: string) => {
  return prisma.user.findUnique({ where: { id } })
})
```

## HIGH: Bundle Size Optimization

**Rule bundle-1: Dynamic imports for heavy components**
```tsx
// ❌ Always loaded
import HeavyChart from '@/components/HeavyChart'

// ✅ Loaded on demand
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Skeleton />,
})
```

**Rule bundle-2: Eliminate barrel file re-exports**
```tsx
// ❌ Pulls in entire library
import { Button, Input, Card } from '@/components/ui'

// ✅ Direct imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

**Rule bundle-3: Conditional loading for optional features**
Load analytics, chat widgets, and other optional scripts only after interaction.

## HIGH: Server-Side Performance

**Rule server-1: Use unstable_cache for expensive DB queries**
```tsx
import { unstable_cache } from 'next/cache'
const getCachedData = unstable_cache(fetchExpensiveData, ['key'], { revalidate: 3600 })
```

**Rule server-2: Serialize data before passing to client components**
Convert Date, BigInt, and other non-serializable types before crossing the server/client boundary.

**Rule server-3: Prefer Server Components for data fetching**
Fetch data in Server Components whenever possible; avoid prop drilling through client components.

## MEDIUM: Client-Side Data Fetching

**Rule client-1: Deduplicate with SWR or React Query**
Never fetch the same data in multiple components — use a shared cache key.

**Rule client-2: Optimistic updates for immediate feedback**
```tsx
mutate(key, { ...data, status: 'updated' }, false) // update cache
await fetch('/api/update', ...) // then server
```

## MEDIUM: Re-render Optimization

**Rule render-1: Memoize expensive calculations**
```tsx
const result = useMemo(() => expensiveCalc(data), [data])
```

**Rule render-2: Stable callbacks with useCallback**
```tsx
const handler = useCallback(() => doSomething(id), [id])
```

**Rule render-3: Split context into data + dispatch**
Avoid re-rendering consumers when only dispatch changes.

**Rule render-4: Use keys to force clean re-mounts instead of complex effect cleanup**

## MEDIUM: Rendering Performance

**Rule perf-1: Virtualize long lists**
Use `react-window` or `@tanstack/virtual` for lists > 100 items.

**Rule perf-2: CSS containment for isolated components**
```css
.card { contain: layout style paint; }
```

**Rule perf-3: content-visibility: auto for off-screen content**
```css
.section { content-visibility: auto; contain-intrinsic-size: 0 500px; }
```

## LOW: JavaScript Performance

**Rule js-1: Use Set/Map for frequent lookups**
```tsx
// ❌ O(n) array lookup
const isSelected = selectedIds.includes(id)
// ✅ O(1) Set lookup
const isSelected = selectedIds.has(id)
```

**Rule js-2: Debounce expensive event handlers**
```tsx
const handleSearch = useDebouncedCallback(search, 300)
```

**Rule js-3: Web Workers for CPU-intensive operations**
Move heavy computations off the main thread.

## Key Principles Summary

1. **Parallelize** all independent async operations with `Promise.all()`
2. **Split code** — dynamic imports for components not needed on initial load
3. **Cache aggressively** — `React.cache()` for deduplication, `unstable_cache` for DB
4. **Measure first** — use React DevTools Profiler before optimizing re-renders
5. **Server first** — fetch data in Server Components, minimize client bundles
