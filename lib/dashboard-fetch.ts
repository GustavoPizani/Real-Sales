// lib/dashboard-fetch.ts
import { createClient } from "@/lib/supabase/client";

let refreshing: Promise<unknown> | null = null;

/**
 * fetch que sobrevive a uma sessão expirada: se a API responder 401, renova a
 * sessão do Supabase (uma vez só, mesmo com várias chamadas em paralelo) e
 * tenta de novo. O dashboard dispara várias chamadas juntas, e todas caíam
 * com 401 quando o token vencia entre uma navegação e outra.
 */
export async function dashboardFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401) return res;

  refreshing ??= createClient()
    .auth.refreshSession()
    .catch(() => null)
    .finally(() => { refreshing = null; });
  await refreshing;

  return fetch(url, init);
}
