// app/(app)/pipeline/page.tsx
// app/(app)/pipeline/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DndContext, type DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Plus, MessageCircle, User, CalendarIcon, Phone, Mail, Search, X, Pencil, Trash2, Filter, Send, Users as UsersIcon, Lock, AlertCircle, Building2, Check, Clock, Hourglass, MoreHorizontal, Trophy, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { differenceInCalendarDays, format, startOfToday, startOfWeek, startOfMonth, subMonths, endOfToday, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Client as Cliente, type User as Broker, Role, ClientOverallStatus } from "@/lib/types";
import { cachedFetch } from "@/lib/api-cache";
import { DateRange } from "react-day-picker";
import { useMobileHeader } from "@/contexts/mobile-header-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// --- Tipos ---
interface Funnel {
  id: string;
  name: string;
  isDefaultEntry: boolean;
  stages: FunnelStage[];
}

interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ActiveOfferSummary {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdBy?: { name: string };
  _count?: { clients: number };
}

// --- Contexto dos cards: etapas do funil aberto e a ação de mover ---
// Evita repassar as duas coisas por coluna → card arrastável → conteúdo.
const PipelineCardContext = React.createContext<{
  stages: FunnelStage[];
  onMove: (clientId: string, stageId: string) => void;
}>({ stages: [], onMove: () => {} });

// Mesmo corte do dashboard: cliente em andamento sem atualização há 7+ dias conta como parado.
const STALE_DAYS = 7;
// Cards desenhados por coluna de cada vez. Uma coluna com centenas de clientes
// travava a tela e o arrasto; o restante entra sob demanda em "Mostrar mais".
const COLUMN_PAGE = 40;
const NO_CLIENTS: Cliente[] = [];

// Moldura em degradê para clientes encerrados. Ativos ficam com a borda neutra.
const STATUS_FRAME: Partial<Record<ClientOverallStatus, string>> = {
  [ClientOverallStatus.WON]: "bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-800",
  [ClientOverallStatus.LOST]: "bg-gradient-to-br from-red-300 via-red-500 to-red-800",
};

// --- Conteúdo compartilhado do card ---
function ClientCardContent({
  client, isDragging = false,
  selectionMode = false, isSelected = false, onToggleSelect,
}: {
  client: Cliente; isDragging?: boolean;
  selectionMode?: boolean; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const { stages, onMove } = React.useContext(PipelineCardContext);

  const isWon = client.overallStatus === ClientOverallStatus.WON;
  const isLost = client.overallStatus === ClientOverallStatus.LOST;
  const isActive = !isWon && !isLost;

  const nextTask = client.tasks?.[0];
  const taskDate = nextTask ? new Date(nextTask.dateTime) : null;
  const taskOverdue = !!taskDate && taskDate < new Date();
  const daysIdle = client.updatedAt ? differenceInCalendarDays(new Date(), new Date(client.updatedAt)) : 0;
  const cleanPhone = client.phone?.replace(/\D/g, "");

  return (
    <div
      onClick={selectionMode ? onToggleSelect : undefined}
      className={cn(
        "group relative mb-2.5 rounded-[16px] p-[1.5px] transition-shadow",
        STATUS_FRAME[client.overallStatus] ?? "bg-border",
        isDragging && "opacity-50",
        selectionMode && "cursor-pointer",
        isSelected && "ring-2 ring-ring ring-offset-1 ring-offset-background",
      )}
    >
      <div className="space-y-2.5 rounded-[14.5px] bg-[var(--bg-card)] p-3 shadow-sm dark:bg-[var(--bg-card-hover)]">
        <div className="flex items-start gap-2">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 flex-shrink-0"
              aria-label={`Selecionar ${client.fullName}`}
            />
          )}
          <div className="min-w-0 flex-1">
            {selectionMode ? (
              <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{client.fullName}</p>
            ) : (
              // O link cobre o card inteiro (after:inset-0); os botões ficam por cima dele.
              <Link
                href={`/client/${client.id}`}
                draggable={false}
                className="block text-sm font-semibold leading-snug text-foreground line-clamp-2 after:absolute after:inset-0 after:rounded-[16px] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
              >
                {client.fullName}
              </Link>
            )}
            {isWon && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />Ganho
              </p>
            )}
            {isLost && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />Perdido
              </p>
            )}
          </div>

          {!selectionMode && (
            // stopPropagation: tocar nos botões não inicia o arrasto do card.
            <div className="relative z-10 flex flex-shrink-0 items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
              {cleanPhone && (
                <a
                  href={`https://wa.me/55${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir WhatsApp de ${client.fullName}`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-700 transition-colors hover:bg-emerald-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Ações de ${client.fullName}`}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                  {stages.map(stage => {
                    const isCurrent = stage.id === client.funnelStageId;
                    return (
                      <DropdownMenuItem key={stage.id} disabled={isCurrent} onSelect={() => onMove(client.id, stage.id)}>
                        <span className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
                        <span className="truncate">{stage.name}</span>
                        {isCurrent && <Check className="ml-auto h-4 w-4" aria-label="Etapa atual" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/client/${client.id}`}>Abrir ficha do cliente</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {isActive && (
          <p className={cn("flex items-center gap-1.5 text-xs", taskOverdue ? "font-medium text-destructive" : "text-muted-foreground")}>
            {taskOverdue
              ? <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              : <Clock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
            <span className="truncate">
              {nextTask && taskDate
                ? `${taskOverdue ? "Atrasada: " : ""}${nextTask.title} · ${format(taskDate, "dd/MM 'às' HH:mm")}`
                : "Sem tarefa agendada"}
            </span>
          </p>
        )}

        {isActive && daysIdle >= STALE_DAYS && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Hourglass className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Parado há {daysIdle} dias
          </p>
        )}

        {client.propertyOfInterest?.title && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{client.propertyOfInterest.title}</span>
          </p>
        )}

        {client.phone && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{client.phone}</span>
          </p>
        )}

        {((client.tags && client.tags.length > 0) || client.broker) && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1">
              {client.tags?.map((tag: any) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}50` }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
            {client.broker && (
              <span className="max-w-[9rem] flex-shrink-0 truncate text-xs text-muted-foreground">{client.broker.name}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Card arrastável para desktop ---
function DraggableClientCard({ client, selectionMode, isSelected, onToggleSelect }: {
  client: Cliente; selectionMode?: boolean; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id, data: { stageId: client.funnelStageId }, disabled: selectionMode });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none"
    >
      <ClientCardContent
        client={client}
        isDragging={isDragging}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}

/** Botão que revela mais cards de uma etapa, quando ela passa do limite desenhado. */
function ShowMoreButton({ hidden, onClick }: { hidden: number; onClick: () => void }) {
  if (hidden <= 0) return null;
  return (
    <Button variant="ghost" className="w-full" onClick={onClick}>
      Mostrar mais {Math.min(COLUMN_PAGE, hidden)} de {hidden} restantes
    </Button>
  );
}

// --- Lista de cards de uma etapa no celular (sem arrastar; mover é pelo menu do card) ---
function MobileStageList({ clients, selectionMode, selectedClientIds, onToggleSelect }: {
  clients: Cliente[]; selectionMode?: boolean;
  selectedClientIds: Set<string>; onToggleSelect: (id: string) => void;
}) {
  const [limit, setLimit] = useState(COLUMN_PAGE);
  return (
    <>
      {clients.slice(0, limit).map(client => (
        <ClientCardContent
          key={client.id}
          client={client}
          selectionMode={selectionMode}
          isSelected={selectedClientIds.has(client.id)}
          onToggleSelect={() => onToggleSelect(client.id)}
        />
      ))}
      <ShowMoreButton hidden={clients.length - limit} onClick={() => setLimit(l => l + COLUMN_PAGE)} />
    </>
  );
}

// --- Componente da Coluna do Funil ---
function FunnelColumn({ stage, clients, selectionMode, selectedClientIds, onToggleSelect, onToggleSelectAll }: {
  stage: FunnelStage; clients: Cliente[]; selectionMode?: boolean;
  selectedClientIds?: Set<string>; onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (clientIds: string[], select: boolean) => void;
}) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { isContainer: true } });
    const [limit, setLimit] = useState(COLUMN_PAGE);
    const visibleClients = useMemo(() => clients.slice(0, limit), [clients, limit]);
    const visibleIds = useMemo(() => visibleClients.map(c => c.id), [visibleClients]);
    // "Selecionar todos" vale para a coluna inteira, não só para os cards desenhados.
    const columnClientIds = useMemo(() => clients.map(c => c.id), [clients]);
    const allSelected = selectionMode && columnClientIds.length > 0 && columnClientIds.every(id => selectedClientIds?.has(id));
    return (
        <div ref={setNodeRef} className="flex h-full w-[300px] flex-shrink-0 flex-col rounded-[20px] bg-[var(--bg-secondary)] dark:bg-[var(--bg-card)]">
            {/* Cabeçalho neutro: a cor da etapa fica num ponto, não no fundo (texto branco sobre cor clara ficava ilegível). */}
            <div className="flex items-center gap-2 px-4 py-3">
                {selectionMode && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => onToggleSelectAll?.(columnClientIds, !!checked)}
                    disabled={columnClientIds.length === 0}
                    aria-label={`Selecionar todos de ${stage.name}`}
                  />
                )}
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: stage.color }} aria-hidden="true" />
                <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{stage.name}</h2>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">{clients.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
                    {visibleClients.map(client => (
                        <DraggableClientCard
                          key={client.id}
                          client={client}
                          selectionMode={selectionMode}
                          isSelected={selectedClientIds?.has(client.id)}
                          onToggleSelect={() => onToggleSelect?.(client.id)}
                        />
                    ))}
                </SortableContext>
                {clients.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Nenhum cliente nesta etapa.</p>
                )}
                <ShowMoreButton hidden={clients.length - limit} onClick={() => setLimit(l => l + COLUMN_PAGE)} />
            </div>
        </div>
    );
}


// A página ocupa exatamente a altura visível: no celular desconta o cabeçalho fixo
// (4rem); no desktop não há barra superior, então é a tela inteira.
const PAGE_HEIGHT = "h-[calc(100dvh-4rem)] lg:h-dvh";
// Campos em pílula sobre a superfície dos cartões, como no dashboard.
const FIELD = "rounded-full bg-[var(--bg-card)] dark:bg-[var(--bg-card-hover)]";

const LAST_FUNNEL_STORAGE_KEY = 'pipeline:lastFunnelId';
const FILTERS_STORAGE_KEY = 'pipeline:filters';

interface PipelineFilters {
  searchTerm: string;
  status: ClientOverallStatus | 'all';
  dateRange: DateRange | undefined;
  brokerId: string;
  managerId: string;
  tagId: string;
}

const defaultFilters: PipelineFilters = {
  searchTerm: '',
  status: ClientOverallStatus.ACTIVE,
  dateRange: undefined,
  brokerId: 'all',
  managerId: 'all',
  tagId: 'all',
};

function loadCachedFilters(): PipelineFilters {
  if (typeof window === 'undefined') return defaultFilters;
  try {
    const raw = window.sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw);
    return {
      ...defaultFilters,
      ...parsed,
      dateRange: parsed.dateRange
        ? {
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : undefined,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : undefined,
          }
        : undefined,
    };
  } catch {
    return defaultFilters;
  }
}

function PipelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-card flex-shrink-0 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Barra de filtros */}
      <div className="p-4 border-b bg-card flex-shrink-0 flex gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      {/* Colunas do funil */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-4">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div key={colIdx} className="flex flex-col w-72 flex-shrink-0 gap-3">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div key={cardIdx} className="p-3 rounded-lg border border-border bg-card space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getDatePresetRange(preset: 'today' | 'week' | 'month' | 'last_month'): DateRange {
  const today = startOfToday();
  switch (preset) {
    case 'today':
      return { from: today, to: endOfToday() };
    case 'week':
      return { from: startOfWeek(today), to: endOfWeek(today) };
    case 'month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'last_month':
      return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
  }
}

const sameDay = (a?: Date, b?: Date) => !!a && !!b && format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd");

/** O intervalo atual é exatamente o de um atalho (Hoje, Esta semana...)? */
function matchesPreset(range: DateRange | undefined, preset: Parameters<typeof getDatePresetRange>[0]) {
  const target = getDatePresetRange(preset);
  return sameDay(range?.from, target.from) && sameDay(range?.to, target.to);
}

// --- Filtro de data (componente estável — não deve ser recriado a cada render) ---
function DateFilter({
  inModal = false,
  filters,
  setFilters,
  pendingDateRange,
  setPendingDateRange,
}: {
  inModal?: boolean;
  filters: PipelineFilters;
  setFilters: React.Dispatch<React.SetStateAction<PipelineFilters>>;
  pendingDateRange: DateRange | undefined;
  setPendingDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}) {
  const activeRange = inModal ? pendingDateRange : filters.dateRange;
  const label = filters.dateRange?.from
    ? `${format(filters.dateRange.from, "dd/MM/yy")}${filters.dateRange.to ? ` → ${format(filters.dateRange.to, "dd/MM/yy")}` : ' → ...'}`
    : "Data de criação";

  const presets = [
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mês' },
    { key: 'last_month', label: 'Mês passado' },
  ] as const;

  if (inModal) {
    const applyPreset = (preset: typeof presets[number]['key']) => {
      setPendingDateRange(getDatePresetRange(preset));
    };

    const rangeLabel = activeRange?.from
      ? activeRange.to
        ? `${format(activeRange.from, "dd/MM/yyyy")} → ${format(activeRange.to, "dd/MM/yyyy")}`
        : `${format(activeRange.from, "dd/MM/yyyy")} → toque na data final`
      : null;

    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Data de criação</p>
          {activeRange?.from && (
            <button
              onClick={() => setPendingDateRange(undefined)}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-2">
          {presets.map(p => (
            <Button
              key={p.key}
              variant={matchesPreset(activeRange, p.key) ? 'default' : 'outline'}
              aria-pressed={matchesPreset(activeRange, p.key)}
              onClick={() => applyPreset(p.key)}
              className="w-full rounded-full"
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Indicador de seleção */}
        {rangeLabel ? (
          <div className="rounded-full bg-muted px-3 py-2 text-center text-sm font-medium">
            {rangeLabel}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            Toque na data inicial, depois na final
          </p>
        )}

        {/* Calendário */}
        <Calendar
          mode="range"
          selected={activeRange}
          onSelect={setPendingDateRange}
          locale={ptBR}
          className="mx-auto w-fit"
          numberOfMonths={1}
        />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-[240px] justify-start text-left font-normal ${FIELD}`}>
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto space-y-4 rounded-[20px] p-4" align="start">
        {/* Atalhos em cima, calendário no meio, intervalo escolhido embaixo. */}
        <div className="flex flex-wrap gap-2">
          {presets.map(p => {
            const active = matchesPreset(filters.dateRange, p.key);
            return (
              <Button
                key={p.key}
                variant={active ? "default" : "outline"}
                size="sm"
                aria-pressed={active}
                className="h-9 rounded-full px-4"
                onClick={() => setFilters(f => ({ ...f, dateRange: getDatePresetRange(p.key) }))}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
        <Calendar mode="range" selected={filters.dateRange} onSelect={date => setFilters(f => ({ ...f, dateRange: date }))} locale={ptBR} />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filters.dateRange?.from
              ? filters.dateRange.to
                ? `${format(filters.dateRange.from, "dd/MM/yyyy")} a ${format(filters.dateRange.to, "dd/MM/yyyy")}`
                : `${format(filters.dateRange.from, "dd/MM/yyyy")} — escolha a data final`
              : "Escolha a data inicial e a final"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full"
            disabled={!filters.dateRange?.from}
            onClick={() => setFilters(f => ({ ...f, dateRange: undefined }))}
          >
            <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Controles de filtro (componente estável — não deve ser recriado a cada render, senão o Input perde o foco a cada tecla) ---
function FilterControls({
  inModal = false,
  filters,
  setFilters,
  pendingDateRange,
  setPendingDateRange,
  managers,
  isRoleActive,
  brokers,
  currentUserId,
  tags,
}: {
  inModal?: boolean;
  filters: PipelineFilters;
  setFilters: React.Dispatch<React.SetStateAction<PipelineFilters>>;
  pendingDateRange: DateRange | undefined;
  setPendingDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  managers: Broker[];
  isRoleActive: (roleName: string) => boolean;
  brokers: Broker[];
  currentUserId?: string;
  tags: Tag[];
}) {
  return (
    <div className={`flex ${inModal ? 'flex-col' : 'flex-wrap items-center'} gap-2`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email, telefone..." className={`pl-8 ${FIELD} ${inModal ? 'w-full' : 'w-64'}`} value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} />
      </div>
      <Select value={String(filters.status)} onValueChange={(value) => setFilters(f => ({...f, status: value as ClientOverallStatus | 'all'}))}>
        <SelectTrigger className={`${FIELD} ${inModal ? 'w-full' : 'w-[180px]'}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value={ClientOverallStatus.ACTIVE}>Em andamento</SelectItem>
          <SelectItem value={ClientOverallStatus.WON}>Ganho</SelectItem>
          <SelectItem value={ClientOverallStatus.LOST}>Perdido</SelectItem>
        </SelectContent>
      </Select>
      <DateFilter inModal={inModal} filters={filters} setFilters={setFilters} pendingDateRange={pendingDateRange} setPendingDateRange={setPendingDateRange} />
      {managers.length > 0 && (
        <Select value={filters.managerId} onValueChange={value => setFilters(f => ({ ...f, managerId: value, brokerId: 'all' }))}>
          <SelectTrigger className={`${FIELD} ${inModal ? 'w-full' : 'w-[180px]'}`}><SelectValue placeholder="Equipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            {managers.map(m => <SelectItem key={m.id} value={m.id}>Equipe {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {isRoleActive('BROKER') && (
        <Select value={filters.brokerId} onValueChange={value => setFilters(f => ({ ...f, brokerId: value }))}>
          <SelectTrigger className={`${FIELD} ${inModal ? 'w-full' : 'w-[180px]'}`}><SelectValue placeholder="Corretor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os corretores</SelectItem>
            {(filters.managerId !== 'all'
              ? brokers.filter(b => b.role === 'BROKER' && b.supervisorId === filters.managerId || b.id === currentUserId)
              : brokers
            ).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={filters.tagId} onValueChange={value => setFilters(f => ({ ...f, tagId: value }))}>
        <SelectTrigger className={`${FIELD} ${inModal ? 'w-full' : 'w-[180px]'}`}><SelectValue placeholder="Etiqueta" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as etiquetas</SelectItem>
          {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" className={`rounded-full ${inModal ? 'w-full' : ''}`} onClick={() => setFilters(defaultFilters)}>
        <X className="h-4 w-4 mr-2" />Limpar filtros
      </Button>
    </div>
  );
}

// --- Componente Principal da Página ---
export default function PipelinePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [allClients, setAllClients] = useState<Cliente[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);

  const selectFunnel = useCallback((funnelId: string) => {
    setSelectedFunnelId(funnelId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_FUNNEL_STORAGE_KEY, funnelId);
    }
  }, []);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [roleSettings, setRoleSettings] = useState<{ roleName: string; isActive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<Cliente | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(undefined);
  const [newClientForm, setNewClientForm] = useState({ fullName: "", phone: "", email: "", selectedbrokerId: "", selectedStageId: "" });

  const [filters, setFilters] = useState<PipelineFilters>(() => loadCachedFilters());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferBrokerId, setTransferBrokerId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [activeOffers, setActiveOffers] = useState<ActiveOfferSummary[]>([]);
  const [loadingActiveOffers, setLoadingActiveOffers] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [isSendingToOffer, setIsSendingToOffer] = useState(false);

  const isMarketingAdmin = user?.role === Role.MARKETING_ADMIN;

  const toggleClientSelection = useCallback((clientId: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId); else next.add(clientId);
      return next;
    });
  }, []);

  const toggleSelectAllInGroup = useCallback((clientIds: string[], select: boolean) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      clientIds.forEach(id => select ? next.add(id) : next.delete(id));
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedClientIds(new Set());
  }, []);

  const fetchActiveOffers = useCallback(async () => {
    setLoadingActiveOffers(true);
    try {
      const res = await fetch('/api/active-offers');
      if (!res.ok) throw new Error('Falha ao carregar ofertas ativas.');
      const data = await res.json();
      const list: ActiveOfferSummary[] = Array.isArray(data) ? data : [];
      setActiveOffers(list.filter(o => o.status !== 'COMPLETED'));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoadingActiveOffers(false);
    }
  }, [toast]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { setActionButton } = useMobileHeader();

  useEffect(() => {
    const filterButton = (
      <Button variant="ghost" size="icon" onClick={() => setIsFilterDialogOpen(true)} className="text-white hover:bg-white/20 hover:text-white">
        <Filter className="h-5 w-5" />
        <span className="sr-only">Filtros</span>
      </Button>
    );
    setActionButton(filterButton);

    return () => setActionButton(null);
  }, [setActionButton]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // REMOVIDO: Não precisamos mais de localStorage nem headers manuais
      // O Middleware do Supabase cuida dos cookies automaticamente.

      // Status vai pro servidor: evita trazer o histórico de Ganhos/Perdidos
      // quando o filtro padrão (Em andamento) é o que está selecionado.
      const clientsUrl = filters.status !== 'all'
        ? `/api/clients?status=${filters.status}`
        : '/api/clients';

      const [clientsRes, funnelsRes, brokersRes, tagsRes, rolesRes] = await Promise.all([
        fetch(clientsUrl),
        cachedFetch('/api/funnels'),
        cachedFetch('/api/users'),
        cachedFetch('/api/tags'),
        cachedFetch('/api/role-settings'),
      ]);

      if (!clientsRes.ok || !funnelsRes.ok || !brokersRes.ok || !tagsRes.ok)
        throw new Error('Falha ao carregar dados do pipeline.');

      const clientsData = await clientsRes.json();
      const funnelsData = await funnelsRes.json();
      const brokersData = await brokersRes.json();
      const tagsData = await tagsRes.json();

      const clientsArray = Array.isArray(clientsData) ? clientsData : (clientsData.clients || []);
      const funnelsArray = Array.isArray(funnelsData) ? funnelsData : (funnelsData.funnels || []);
      const brokersArray = Array.isArray(brokersData) ? brokersData : (brokersData.users || []);
      const tagsArray = Array.isArray(tagsData) ? tagsData : (tagsData.tags || []);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoleSettings(rolesData.settings || []);
      }

      setAllClients(clientsArray);
      setFunnels(funnelsArray);

      if (funnelsArray.length > 0 && !selectedFunnelId) {
        const lastFunnelId = typeof window !== 'undefined'
          ? window.localStorage.getItem(LAST_FUNNEL_STORAGE_KEY)
          : null;
        const hasLastFunnel = lastFunnelId && funnelsArray.some((f: Funnel) => f.id === lastFunnelId);
        setSelectedFunnelId(hasLastFunnel ? lastFunnelId : funnelsArray[0].id);
      }

      setBrokers(brokersArray);
      setTags(tagsArray);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedFunnelId, filters.status]);

  const selectedFunnel = useMemo(() => {
    if (!selectedFunnelId) return null;
    return funnels.find(f => f.id === selectedFunnelId);
  }, [funnels, selectedFunnelId]);

  const funnelStages = selectedFunnel?.stages || [];

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const isRoleActive = useCallback((roleName: string) => {
    const setting = roleSettings.find(r => r.roleName === roleName);
    return setting ? setting.isActive : true;
  }, [roleSettings]);

  // "Gerente" não é mais um cargo — um corretor entra na lista de equipes se supervisiona outros corretores
  const managers = useMemo(() => {
    const supervisorIds = new Set(brokers.map(b => b.supervisorId).filter((id): id is string => !!id));
    return brokers.filter(b => supervisorIds.has(b.id));
  }, [brokers]);

  const filteredClients = useMemo(() => {
    // Brokers da equipe do gerente selecionado
    const teamBrokerIds = filters.managerId !== 'all'
      ? brokers.filter(b => b.supervisorId === filters.managerId).map(b => b.id)
      : null;

    return allClients.filter(client => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      const matchesSearch = !filters.searchTerm ||
        client.fullName.toLowerCase().includes(searchTermLower) ||
        (client.email && client.email.toLowerCase().includes(searchTermLower)) ||
        (client.phone && client.phone.includes(filters.searchTerm));

      // Status já vem filtrado do servidor (ver fetchData) — não repetir aqui.

      const matchesBroker = filters.brokerId === 'all' || client.brokerId === filters.brokerId;

      const matchesManager = !teamBrokerIds || teamBrokerIds.includes(client.brokerId);

      const matchesDate = !filters.dateRange?.from || (
        new Date(client.createdAt) >= filters.dateRange.from &&
        new Date(client.createdAt) <= (filters.dateRange.to || filters.dateRange.from)
      );

      const matchesTag = filters.tagId === 'all' || client.tags?.some(tag => tag.id === filters.tagId);

      return matchesSearch && matchesBroker && matchesManager && matchesDate && matchesTag;
    });
  }, [allClients, filters, brokers]);

  const selectedClients = useMemo(
    () => allClients.filter(c => selectedClientIds.has(c.id)),
    [allClients, selectedClientIds]
  );
  const selectedLostClients = useMemo(
    () => selectedClients.filter(c => c.overallStatus === ClientOverallStatus.LOST),
    [selectedClients]
  );

  const handleConfirmTransfer = async () => {
    if (!transferBrokerId) {
      toast({ variant: 'destructive', title: 'Selecione um corretor' });
      return;
    }
    setIsTransferring(true);
    try {
      const res = await fetch('/api/clients/bulk-transfer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: Array.from(selectedClientIds), brokerId: transferBrokerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao transferir clientes.');
      toast({ title: 'Sucesso!', description: `${data.updatedCount} cliente(s) transferido(s).` });
      setIsTransferDialogOpen(false);
      setTransferBrokerId("");
      exitSelectionMode();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleConfirmSendToOffer = async () => {
    if (!selectedOfferId) {
      toast({ variant: 'destructive', title: 'Selecione uma oferta ativa' });
      return;
    }
    setIsSendingToOffer(true);
    try {
      const res = await fetch(`/api/active-offers/${selectedOfferId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: selectedLostClients.map(c => c.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao enviar clientes para a oferta ativa.');
      const parts = [`${data.linkedCount} enviado(s).`];
      if (data.alreadyLinkedCount) parts.push(`${data.alreadyLinkedCount} já vinculado(s).`);
      if (data.skippedCount) parts.push(`${data.skippedCount} ignorado(s) (não perdidos).`);
      toast({ title: 'Sucesso!', description: parts.join(' ') });
      setIsOfferDialogOpen(false);
      setSelectedOfferId("");
      exitSelectionMode();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsSendingToOffer(false);
    }
  };

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setActiveClient(allClients.find(c => c.id === active.id) || null);
  };
  
  // Move o cliente de etapa: usado pelo arrasto (desktop) e pelo menu "Mover para"
  // do card (celular e teclado). A tela muda na hora e volta atrás se a API recusar.
  const moveClient = useCallback(async (clientId: string, newStageId: string) => {
    if (!selectedFunnel) return;
    const newFunnelId = selectedFunnel.id;
    let previous: Cliente | undefined;

    setAllClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      previous = c;
      return { ...c, funnelId: newFunnelId, funnelStageId: newStageId };
    }));

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelId: newFunnelId, funnelStageId: newStageId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível mover o cliente.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      const original = previous;
      if (original) setAllClients(prev => prev.map(c => (c.id === clientId ? original : c)));
    }
  }, [selectedFunnel, toast]);

  const cardContext = useMemo(() => ({ stages: funnelStages, onMove: moveClient }), [funnelStages, moveClient]);

  // Clientes agrupados por etapa uma vez só, em vez de filtrar a lista inteira para cada coluna.
  const clientsByStage = useMemo(() => {
    const map = new Map<string, Cliente[]>();
    for (const client of filteredClients) {
      const list = map.get(client.funnelStageId);
      if (list) list.push(client); else map.set(client.funnelStageId, [client]);
    }
    return map;
  }, [filteredClients]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    // O alvo pode ser a coluna (área vazia) ou um card dentro dela. Antes só a
    // coluna contava, então soltar em cima de outro card não movia o cliente.
    const targetStageId: string | undefined = over?.data.current?.isContainer
      ? String(over.id)
      : over?.data.current?.stageId;

    if (targetStageId && active.data.current?.stageId !== targetStageId) {
      moveClient(String(active.id), targetStageId);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const isManager = user && ['MARKETING_ADMIN', 'diretor', 'gerente'].includes(user.role as Role);
    const brokerId = isManager ? newClientForm.selectedbrokerId : user?.id;

    if (!brokerId) {
        toast({
            variant: "destructive",
            title: "Campo obrigatório",
            description: isManager ? "Por favor, selecione um BROKER responsável." : "Usuário não identificado.",
        });
        return;
    }

    const defaultFunnel = funnels.find(f => f.isDefaultEntry) || funnels[0];
    if (!defaultFunnel || !defaultFunnel.stages.length) {
        toast({ variant: "destructive", title: "Configuração necessária", description: "Nenhum funil de entrada padrão foi configurado." });
        return;
    }
    const stageId = newClientForm.selectedStageId || defaultFunnel.stages[0].id;

    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: newClientForm.fullName,
                phone: newClientForm.phone,
                email: newClientForm.email,
                funnelId: defaultFunnel.id,
                funnelStageId: stageId,
                brokerId: brokerId,
            }),
        });
        if (!response.ok) throw new Error('Falha ao criar cliente.');
        toast({ title: 'Sucesso!', description: 'Novo cliente adicionado.' });
        setIsClientDialogOpen(false);
        setNewClientForm({ fullName: "", phone: "", email: "", selectedbrokerId: "", selectedStageId: "" });
        fetchData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível criar o cliente.' });
    }
  };

  if (loading) return <PipelineSkeleton />;

  if (funnels.length === 0) {
    return (
      <div className={`${PAGE_HEIGHT} flex flex-col items-center justify-center bg-background text-center p-6`}>
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Nenhum funil liberado</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Você ainda não tem acesso a nenhum funil de vendas. Peça a um administrador para liberar o acesso em Configurações → Gerenciar Funis.
        </p>
      </div>
    );
  }

  return (
    <PipelineCardContext.Provider value={cardContext}>
    <div className={`${PAGE_HEIGHT} flex flex-col bg-background overflow-hidden`}>
      <header className="flex-shrink-0 border-b lg:border-b-0">
        {/* Mobile header */}
        <div className="flex items-center gap-2 px-4 py-3 lg:hidden">
          <Select value={selectedFunnelId || ''} onValueChange={selectFunnel}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Selecione um funil..." />
            </SelectTrigger>
            <SelectContent>
              {funnels.map(funnel => <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {user?.role === 'MARKETING_ADMIN' && (
            <Link href="/settings/funnels">
              <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
          {isMarketingAdmin && (
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            >
              <UsersIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pipeline de Vendas</h1>
                <Select value={selectedFunnelId || ''} onValueChange={selectFunnel}>
                  <SelectTrigger className={`w-[200px] ${FIELD}`}>
                    <SelectValue placeholder="Selecione um funil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funnels.map(funnel => <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {user?.role === 'MARKETING_ADMIN' && (
                  <Link href="/settings/funnels">
                      <Button variant="outline" size="sm" className="rounded-full">
                          <Pencil className="h-3 w-3 mr-2" />
                          Gerenciar Funis
                      </Button>
                  </Link>
                )}
                {isMarketingAdmin && (
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  >
                    <UsersIcon className="h-3 w-3 mr-2" />
                    {selectionMode ? "Sair da seleção" : "Selecionar em massa"}
                  </Button>
                )}
            </div>
            <div>
              <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                  <DialogTrigger asChild>
                      <Button className="h-11 rounded-full px-5"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader><DialogTitle>Adicionar Novo Cliente</DialogTitle></DialogHeader>
                      <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                          <div><Label htmlFor="fullName">Nome Completo</Label><Input id="fullName" value={newClientForm.fullName} onChange={(e) => setNewClientForm(p => ({...p, fullName: e.target.value}))} required /></div>
                          <div><Label htmlFor="phone">Telefone</Label><PhoneInput value={newClientForm.phone} onChange={v => setNewClientForm(p => ({...p, phone: v}))} /></div>
                          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={newClientForm.email} onChange={(e) => setNewClientForm(p => ({...p, email: e.target.value}))} /></div>
                        {(() => {
                          const defaultFunnel = funnels.find(f => f.isDefaultEntry) || funnels[0];
                          return defaultFunnel?.stages.length ? (
                            <div>
                              <Label htmlFor="stage">Etapa do Funil</Label>
                              <Select
                                value={newClientForm.selectedStageId || defaultFunnel.stages[0].id}
                                onValueChange={value => setNewClientForm(p => ({ ...p, selectedStageId: value }))}
                              >
                                <SelectTrigger id="stage" className="w-full">
                                  <SelectValue placeholder="Selecione a etapa" />
                                </SelectTrigger>
                                <SelectContent>
                                  {defaultFunnel.stages.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                        {s.name}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null;
                        })()}
                        {isRoleActive('BROKER') && user && user.role === Role.MARKETING_ADMIN && (
                          <div>
                            <Label htmlFor="broker">Corretor Responsável</Label>
                            <Select
                              value={newClientForm.selectedbrokerId}
                              onValueChange={value => setNewClientForm(p => ({ ...p, selectedbrokerId: value }))}
                            >
                              <SelectTrigger id="broker" className="w-full">
                                <SelectValue placeholder="Selecione um corretor" />
                              </SelectTrigger>
                              <SelectContent>
                                {brokers.filter(b => b.role === 'BROKER').map(broker => (
                                  <SelectItem key={broker.id} value={broker.id}>{broker.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsClientDialogOpen(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></div>
                      </form>
                  </DialogContent>
              </Dialog>
            </div>
        </div>
      </header>
      
      {/* Filtros para Desktop */}
      <div className="px-6 pb-4 flex-shrink-0 hidden lg:flex">
        <FilterControls
          filters={filters}
          setFilters={setFilters}
          pendingDateRange={pendingDateRange}
          setPendingDateRange={setPendingDateRange}
          managers={managers}
          isRoleActive={isRoleActive}
          brokers={brokers}
          currentUserId={user?.id}
          tags={tags}
        />
      </div>
      
      {/* Layout Desktop: Colunas do Funil */}
      <div className="flex-1 overflow-x-auto px-6 pb-4 hidden lg:flex">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {funnelStages.map((stage) => (
              <FunnelColumn
                key={stage.id}
                stage={stage}
                clients={clientsByStage.get(stage.id) ?? NO_CLIENTS}
                selectionMode={selectionMode}
                selectedClientIds={selectedClientIds}
                onToggleSelect={toggleClientSelection}
                onToggleSelectAll={toggleSelectAllInGroup}
              />
            ))}
          </div>
          <DragOverlay>
            {activeClient ? <DraggableClientCard client={activeClient} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Layout Mobile: Abas */}
      <div className="block lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* key: ao trocar de funil as abas recomeçam na primeira etapa do funil novo
            (sem isso nenhuma aba ficava selecionada e a lista aparecia vazia). */}
        <Tabs key={selectedFunnelId ?? 'none'} defaultValue={funnelStages[0]?.id} className="flex-1 flex flex-col overflow-hidden">
          {/* Stage tabs — scroll horizontal sem barra visível */}
          <div
            className="no-scrollbar flex-shrink-0 bg-card border-b border-border overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <TabsList className="flex w-max bg-transparent rounded-none border-none shadow-none h-auto px-3 py-2 gap-1.5">
              {funnelStages.map((stage) => {
                const count = clientsByStage.get(stage.id)?.length ?? 0;
                return (
                  <TabsTrigger
                    key={stage.id}
                    value={stage.id}
                    className="flex-shrink-0 whitespace-nowrap rounded-full h-auto px-3.5 py-2 text-sm font-medium
                      border border-border/60 bg-card text-muted-foreground shadow-none
                      data-[state=active]:bg-secondary-custom data-[state=active]:text-primary-custom
                      data-[state=active]:border-secondary-custom data-[state=active]:shadow-sm
                      transition-all duration-200 gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                    <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-black/10 dark:bg-white/15 text-xs font-semibold tabular-nums">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Conteúdo de cada aba */}
          <div className="flex-1 overflow-hidden">
            {funnelStages.map((stage) => {
              const stageClients = clientsByStage.get(stage.id) ?? NO_CLIENTS;
              return (
                <TabsContent
                  key={stage.id}
                  value={stage.id}
                  className="h-full mt-0 data-[state=inactive]:hidden"
                >
                  <div className="h-full overflow-y-auto p-3 space-y-2 pb-24">
                    {selectionMode && stageClients.length > 0 && (
                      <div className="flex items-center gap-2 px-1 pb-1 text-sm text-muted-foreground">
                        <Checkbox
                          checked={stageClients.every(c => selectedClientIds.has(c.id))}
                          onCheckedChange={(checked) => toggleSelectAllInGroup(stageClients.map(c => c.id), !!checked)}
                        />
                        Selecionar todos
                      </div>
                    )}
                    {stageClients.length > 0
                      ? (
                          <MobileStageList
                            clients={stageClients}
                            selectionMode={selectionMode}
                            selectedClientIds={selectedClientIds}
                            onToggleSelect={toggleClientSelection}
                          />
                        )
                      : (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 opacity-40"
                            style={{ backgroundColor: stage.color + '30' }}
                          >
                            <User className="h-5 w-5" style={{ color: stage.color }} />
                          </div>
                          <p className="text-sm font-medium">Nenhum cliente</p>
                          <p className="text-xs mt-0.5 text-muted-foreground">Nesta etapa do funil</p>
                        </div>
                      )
                    }
                  </div>
                </TabsContent>
              );
            })}
          </div>
        </Tabs>
      </div>

      {/* FAB para Novo Cliente em Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-xl"
          style={{ background: 'var(--secondary-custom)', color: 'var(--primary-custom)' }}
          onClick={() => setIsClientDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Novo Cliente</span>
        </Button>
      </div>

      {/* Barra de ação em massa */}
      {selectionMode && selectedClientIds.size > 0 && (
        <div className="fixed bottom-3 left-3 right-3 z-50 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-3 shadow-2xl lg:left-24">
          <span className="text-sm font-medium">{selectedClientIds.size} selecionado(s)</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exitSelectionMode}>Cancelar</Button>
            <Button size="sm" onClick={() => setIsTransferDialogOpen(true)}>Transferir para corretor</Button>
            <Button
              size="sm"
              variant={selectedLostClients.length > 0 ? "default" : "outline"}
              disabled={selectedLostClients.length === 0}
              onClick={() => { setIsOfferDialogOpen(true); fetchActiveOffers(); }}
              title={selectedLostClients.length === 0 ? "Nenhum dos selecionados está marcado como Perdido" : undefined}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Enviar para oferta ativa ({selectedLostClients.length})
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Filtros para Mobile */}
      <Dialog
        open={isFilterDialogOpen}
        onOpenChange={(open) => {
          if (open) setPendingDateRange(filters.dateRange);
          setIsFilterDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2 pr-1">
            <FilterControls
              inModal={true}
              filters={filters}
              setFilters={setFilters}
              pendingDateRange={pendingDateRange}
              setPendingDateRange={setPendingDateRange}
              managers={managers}
              isRoleActive={isRoleActive}
              brokers={brokers}
              currentUserId={user?.id}
              tags={tags}
            />
          </div>
          <DialogFooter className="flex-shrink-0 pt-2">
            <Button
              onClick={() => {
                setFilters(f => ({ ...f, dateRange: pendingDateRange }));
                setIsFilterDialogOpen(false);
              }}
              className="w-full"
            >
              Aplicar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transferir {selectedClientIds.size} cliente(s) para outro corretor</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="transferBroker">Corretor de destino</Label>
            <Select value={transferBrokerId} onValueChange={setTransferBrokerId}>
              <SelectTrigger id="transferBroker"><SelectValue placeholder="Selecione um corretor" /></SelectTrigger>
              <SelectContent>
                {brokers.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmTransfer} disabled={isTransferring || !transferBrokerId}>
              {isTransferring ? "Transferindo..." : "Confirmar transferência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enviar {selectedLostClients.length} cliente(s) perdido(s) para Oferta Ativa</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="targetOffer">Oferta ativa</Label>
            <Select value={selectedOfferId} onValueChange={setSelectedOfferId} disabled={loadingActiveOffers}>
              <SelectTrigger id="targetOffer"><SelectValue placeholder={loadingActiveOffers ? "Carregando..." : "Selecione uma oferta ativa"} /></SelectTrigger>
              <SelectContent>
                {activeOffers.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name} ({o._count?.clients ?? 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientIds.size !== selectedLostClients.length && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedClientIds.size - selectedLostClients.length} dos selecionados não estão marcados como "Perdido" e serão ignorados.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOfferDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmSendToOffer} disabled={isSendingToOffer || !selectedOfferId}>
              {isSendingToOffer ? "Enviando..." : "Confirmar envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PipelineCardContext.Provider>
  )
}
