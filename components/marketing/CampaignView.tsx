"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DASH_CARD } from "@/components/dashboard/ui";
import type { CampaignRow } from "@/hooks/marketing/useDashboardData";

type SortKey = "campaign_name" | "spend" | "leads" | "cpl" | "clicks" | "cpc" | "ctr";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "campaign_name", label: "Campanha", numeric: false },
  { key: "spend", label: "Investimento", numeric: true },
  { key: "leads", label: "Leads", numeric: true },
  { key: "cpl", label: "CPL", numeric: true },
  { key: "clicks", label: "Cliques", numeric: true },
  { key: "cpc", label: "CPC", numeric: true },
  { key: "ctr", label: "CTR", numeric: true },
];

const formatBRL = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const formatInt = (value: number) => new Intl.NumberFormat("pt-BR").format(value || 0);

export const CampaignView = ({
  data = [],
  isLoading = false,
  showAccount = false,
}: {
  data?: CampaignRow[];
  isLoading?: boolean;
  /** Mostra a conta de anúncio abaixo do nome (quando todas as contas estão juntas). */
  showAccount?: boolean;
}) => {
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "spend", direction: "desc" });

  const sorted = useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      // Campanha sem lead não tem CPL: vai para o fim em qualquer direção, em vez de aparecer como "a mais barata".
      if (sort.key === "cpl" && (a.leads === 0) !== (b.leads === 0)) return a.leads === 0 ? 1 : -1;
      const x = a[sort.key];
      const y = b[sort.key];
      return typeof x === "string" ? factor * x.localeCompare(String(y)) : factor * ((x as number) - (y as number));
    });
  }, [data, sort]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => (prev.key === key
      ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "campaign_name" || key === "cpl" || key === "cpc" ? "asc" : "desc" }));

  if (isLoading) {
    return (
      <div className={`space-y-3 p-5 ${DASH_CARD}`} aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className={`px-5 py-12 text-center text-sm text-muted-foreground ${DASH_CARD}`}>Nenhuma campanha com dados no período.</p>;
  }

  return (
    <div className={`overflow-x-auto ${DASH_CARD}`}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {COLUMNS.map(column => {
              const active = sort.key === column.key;
              const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
              return (
                <TableHead
                  key={column.key}
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                  className={column.numeric ? "text-right" : ""}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {column.label}
                    <Icon className={`h-3.5 w-3.5 ${active ? "" : "opacity-50"}`} aria-hidden="true" />
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(row => (
            <TableRow key={`${row.account_name}|${row.campaign_name}`}>
              <TableCell className="max-w-[18rem]">
                <p className="truncate font-medium text-foreground" title={row.campaign_name}>{row.campaign_name}</p>
                {showAccount && <p className="truncate text-xs text-muted-foreground">{row.account_name}</p>}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums text-foreground">{formatBRL(row.spend)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums text-foreground">{formatInt(row.leads)}</TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums text-foreground">{row.leads > 0 ? formatBRL(row.cpl) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{formatInt(row.clicks)}</TableCell>
              <TableCell className="whitespace-nowrap text-right tabular-nums text-muted-foreground">{row.clicks > 0 ? formatBRL(row.cpc) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{row.ctr.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
