const cache = new Map<string, { data: any; ts: number }>();

const TTL: Record<string, number> = {
  '/api/funnels': 5 * 60 * 1000,
  '/api/users': 5 * 60 * 1000,
  '/api/tags': 2 * 60 * 1000,
  '/api/lost-reasons': 10 * 60 * 1000,
  '/api/properties': 5 * 60 * 1000,
  '/api/roletas?status=active': 5 * 60 * 1000,
  '/api/role-settings': 5 * 60 * 1000,
};

export async function cachedFetch(url: string, options?: RequestInit): Promise<Response> {
  const ttl = TTL[url];

  if (ttl) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < ttl) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const res = await fetch(url, options);

  if (res.ok && ttl) {
    const clone = res.clone();
    clone.json().then(data => {
      cache.set(url, { data, ts: Date.now() });
    }).catch(() => null);
  }

  return res;
}

export function invalidateCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}

export function warmUpDb() {
  const ping = (attempt = 0) => {
    fetch('/api/health').then(r => {
      if (!r.ok && attempt < 2) setTimeout(() => ping(attempt + 1), 3000);
    }).catch(() => {
      if (attempt < 2) setTimeout(() => ping(attempt + 1), 3000);
    });
  };
  ping();
}
