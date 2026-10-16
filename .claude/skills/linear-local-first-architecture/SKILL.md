---
name: linear-local-first-architecture
description: Use when building a web app that must feel instant, when users complain about spinners or perceived slowness despite acceptable latency, or when designing a local-first sync architecture with optimistic updates.
---

## When to use this skill

- You're building a productivity tool where perceived speed is critical to user experience
- Users report the app "feels slow" despite reasonable network latency
- You need to eliminate loading spinners and skeleton states from user workflows
- You're architecting a local-first application with offline capabilities
- You want to implement optimistic updates that feel instant
- You're designing a keyboard-first interface for power users

## Core principles

1. **The network is the bottleneck—eliminate it wherever possible.** Every network request costs hundreds of milliseconds; the best optimization is to avoid the request entirely by reading from local state.

2. **Treat the browser as the database for each user.** Store the full workspace in IndexedDB and hydrate into an in-memory observable graph; the UI reads from local state, not the server.

3. **Mutations apply locally first, sync asynchronously.** Update the local observable immediately so the UI re-renders synchronously, then queue the transaction for background sync to the server.

4. **Render first, authenticate second.** If local data exists, render it immediately and verify the session in the background; only redirect to login if the server rejects.

5. **Ship less code in more pieces.** Aggressive code splitting, modern-only targets, and per-package vendor chunks reduce initial payload and improve cache granularity.

6. **Animate only composited properties.** Restrict animations to `transform` and `opacity` to keep work on the GPU; never animate layout-triggering properties like `width`, `height`, or `margin`.

## Tactics

### Implement optimistic updates with standard libraries

```typescript
// optimistic mutation with SWR
mutate(
  `/api/issues/${issue.id}`,
  { ...issue, title: "Faster app launch" },
  false
);
await fetch(`/api/issues/${issue.id}`, { method: 'PATCH', body: JSON.stringify({ title: "Faster app launch" }) });
```

The key: UI responsiveness should not depend on network latency. Users perceive speed based on how quickly the interface reacts, not how quickly the server responds.

### Reduce bundle size with modern-only builds

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: "esnext",
    cssMinify: "lightningcss",
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            const pkg = id.match(/node_modules\/([^/]+)/)?.[1];
            if (pkg) return `vendor-${pkg}`;
          }
        },
      },
    },
  },
});
```

Split every npm package into its own chunk — cache invalidation becomes per-library, not per-app-revision.

### Assume authentication, verify in background

```javascript
if (localStorage.getItem("ApplicationStore") === null) {
  document.documentElement.classList.add("logged-out");
}
```

If local data exists, render it immediately. Let the next network request fail with 401 if the session is stale, then redirect to login. The flow is "do we have anything to show you," not "do you have a valid session."

### Use granular observables for surgical re-renders

A change to one field on one record re-renders only the components that read that field — not the parent list. A 50-record update = 50 cell re-renders, not a full list re-render.

### Animate only composited properties

```css
/* ✅ GPU-accelerated */
.row:hover { background-color: var(--color-bg-hover); transition: background-color 0.12s; }
.icon-arrow { transform: translateX(0); transition: transform 0.15s; }

/* ❌ Triggers layout for every sibling */
.row:hover { margin-left: 2px; transition: all 0.2s; }
```

### Keep animation durations short

```css
--speed-quickTransition: .1s;
--speed-regularTransition: .25s;
--speed-slowTransition: .35s;
```

Use asymmetric timing: appear instantly when summoned, fade out over 150ms when dismissed.

## Anti-patterns

❌ **Don't wait for network requests before updating the UI.** Apply mutations locally first, sync in background, rollback only on server rejection.

❌ **Don't animate layout-triggering properties** (`width`, `height`, `margin`, `padding`, `top`, `left`). Stick to `transform` and `opacity`.

❌ **Don't block initial render on authentication.** Render local data immediately, verify session asynchronously.

❌ **Don't bundle all vendor code into a single chunk.** Per-package chunks = granular cache invalidation.

❌ **Don't use long animation durations (>250ms) for frequent interactions.**

❌ **Don't fetch data on every navigation if it's already local.**

## Source

[How's Linear so fast? A technical breakdown](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown)
