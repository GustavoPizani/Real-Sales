"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardFetch } from "@/lib/dashboard-fetch";
import { formatBRL } from "./types";

interface DetailClient {
  id: string;
  fullName: string;
  brokerName: string;
  stageName: string;
  status: "ACTIVE" | "WON" | "LOST";
  date: string | null;
  value: number | null;
}

interface DetailResponse {
  total: number;
  clients: DetailClient[];
}

const STATUS_LABEL: Record<DetailClient["status"], string> = { ACTIVE: "Em andamento", WON: "Ganho", LOST: "Perdido" };

export interface KpiDetailTarget {
  /** leads | won | step:<id> */
  metric: string;
  title: string;
}

/** Lista os clientes por trás de um indicador, com os mesmos filtros da tela. */
export function KpiDetailDialog({
  target,
  query,
  showBroker,
  onClose,
}: {
  target: KpiDetailTarget | null;
  /** Filtros atuais das análises, já como query string. */
  query: string;
  showBroker: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setData(null);
    setHasError(false);

    const params = new URLSearchParams(query);
    params.set("detail", target.metric);
    dashboardFetch(`/api/dashboard/analytics?${params}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((json: DetailResponse) => { if (!cancelled) setData(json); })
      .catch(() => { if (!cancelled) setHasError(true); });

    return () => { cancelled = true; };
  }, [target, query]);

  return (
    <Dialog open={!!target} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border p-4 pr-12 text-left">
          <DialogTitle>{target?.title}</DialogTitle>
          <DialogDescription>
            {data ? `${data.total.toLocaleString("pt-BR")} ${data.total === 1 ? "cliente" : "clientes"}` : "Carregando clientes..."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasError ? (
            <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
              Não foi possível carregar a lista.
            </p>
          ) : !data ? (
            <div className="space-y-2 p-4" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : data.clients.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente neste indicador no período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.clients.map(client => (
                <li key={client.id}>
                  <Link href={`/client/${client.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{client.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.status === "ACTIVE" ? client.stageName : STATUS_LABEL[client.status]}
                        {showBroker && ` · ${client.brokerName}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {client.value !== null && (
                        <p className="text-sm font-medium tabular-nums text-foreground">{formatBRL(client.value)}</p>
                      )}
                      {client.date && (
                        <p className="text-xs tabular-nums text-muted-foreground">{format(new Date(client.date), "dd/MM/yyyy")}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && data.total > data.clients.length && (
          <p className="border-t border-border p-3 text-center text-xs text-muted-foreground">
            Mostrando {data.clients.length} de {data.total.toLocaleString("pt-BR")}. Reduza o período para ver todos.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
