"use client";

import { ImageOff, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DASH_CARD } from "@/components/dashboard/ui";
import type { CreativeRow } from "@/hooks/marketing/useDashboardData";

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] lg:gap-4";

const formatBRL = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatInt = (value: number) => new Intl.NumberFormat("pt-BR").format(value || 0);

export const CreativeView = ({ data = [], isLoading = false }: { data?: CreativeRow[]; isLoading?: boolean }) => {
  if (isLoading) {
    return (
      <ul className={GRID} aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className={`overflow-hidden ${DASH_CARD}`}>
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex flex-col items-center px-5 py-12 text-center ${DASH_CARD}`}>
        <Megaphone className="mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Nenhum criativo com dados no período.</p>
      </div>
    );
  }

  return (
    <ul className={GRID}>
      {data.map(creative => (
        <li key={`${creative.account_name}|${creative.campaign_name}|${creative.ad_name}`} className={`flex flex-col overflow-hidden ${DASH_CARD}`}>
          {/* A imagem do anúncio vem do Meta e fica guardada na sincronização. */}
          <div className="aspect-video bg-muted">
            {creative.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creative.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                <ImageOff className="h-8 w-8 text-muted-foreground/50" aria-label="Sem imagem" />
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground" title={creative.ad_name}>{creative.ad_name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground" title={creative.campaign_name}>{creative.campaign_name}</p>
            </div>

            <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3">
              <div>
                <dt className="text-xs text-muted-foreground">Leads</dt>
                <dd className="text-xl font-semibold tabular-nums text-foreground">{formatInt(creative.leads)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">CPL</dt>
                <dd className="text-xl font-semibold tabular-nums text-foreground">{creative.leads > 0 ? formatBRL(creative.cpl) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Investimento</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">{formatBRL(creative.spend)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cliques (CTR)</dt>
                <dd className="text-sm font-medium tabular-nums text-foreground">
                  {formatInt(creative.clicks)} <span className="text-muted-foreground">({creative.ctr.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)</span>
                </dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
};
