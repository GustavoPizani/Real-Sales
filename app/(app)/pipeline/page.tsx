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
import { Plus, MessageCircle, User, CalendarIcon, Phone, Mail, Search, X, Pencil, Trash2, Filter, Send, Users as UsersIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfToday, startOfWeek, startOfMonth, subMonths, endOfToday, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Cliente, type User as Broker, Role, ClientOverallStatus } from "@/lib/types";
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

// --- Conteúdo compartilhado do card ---
function ClientCardContent({
  client, onClientClick, isDragging = false,
  selectionMode = false, isSelected = false, onToggleSelect,
}: {
  client: Cliente; onClientClick: () => void; isDragging?: boolean;
  selectionMode?: boolean; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  const initials = client.fullName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border) / 0.5)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        borderRadius: '14px',
        overflow: 'hidden',
        marginBottom: '10px',
        opacity: isDragging ? 0.5 : 1,
      }}
      onClick={selectionMode ? onToggleSelect : onClientClick}
      className="group cursor-pointer"
    >
      <div className="h-1 w-full bg-gradient-to-r from-secondary-custom via-secondary-custom/60 to-transparent" />
      <div className="p-3.5 space-y-3">
        <div className="flex items-center gap-2.5">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect?.()}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            />
          )}
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--secondary-custom), #6b5a2a)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm leading-tight truncate">{client.fullName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <CalendarIcon className="h-2.5 w-2.5" />
              {client.createdAt ? format(new Date(client.createdAt), "dd/MM/yy") : ''}
            </p>
          </div>
          {client.phone && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500/20 flex-shrink-0"
              onClick={(e) => openWhatsApp(client.phone!, e)}
            >
              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
            </Button>
          )}
        </div>

        {(client.phone || client.email) && (
          <div className="space-y-1.5 rounded-lg bg-muted/30 px-3 py-2">
            {client.phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0 text-secondary-custom/70" />
                <span className="truncate">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0 text-secondary-custom/70" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {client.tags && client.tags.length > 0
              ? client.tags.map((tag: any) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: tag.color + '25', color: tag.color, border: `1px solid ${tag.color}50` }}
                  >
                    {tag.name}
                  </span>
                ))
              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary-custom/15 text-secondary-custom border border-secondary-custom/25">Lead</span>
            }
          </div>
          {client.broker && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center">
                <span className="text-[9px] font-bold text-muted-foreground uppercase">
                  {client.broker.name.charAt(0)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">{client.broker.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Card arrastável para desktop ---
function DraggableClientCard({ client, selectionMode, isSelected, onToggleSelect }: {
  client: Cliente; selectionMode?: boolean; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const router = useRouter();
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
        onClientClick={() => router.push(`/client/${client.id}`)}
        isDragging={isDragging}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}

// --- Card simples para mobile (sem DnD, permite scroll) ---
function MobileClientCard({ client, selectionMode, isSelected, onToggleSelect }: {
  client: Cliente; selectionMode?: boolean; isSelected?: boolean; onToggleSelect?: () => void;
}) {
  const router = useRouter();
  return (
    <ClientCardContent
      client={client}
      onClientClick={() => router.push(`/client/${client.id}`)}
      selectionMode={selectionMode}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
    />
  );
}

// --- Componente da Coluna do Funil ---
function FunnelColumn({ stage, clients, selectionMode, selectedClientIds, onToggleSelect, onToggleSelectAll }: {
  stage: FunnelStage; clients: Cliente[]; selectionMode?: boolean;
  selectedClientIds?: Set<string>; onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (clientIds: string[], select: boolean) => void;
}) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { isContainer: true } });
    const columnClientIds = useMemo(() => clients.map(c => c.id), [clients]);
    const allSelected = selectionMode && columnClientIds.length > 0 && columnClientIds.every(id => selectedClientIds?.has(id));
    return (
        <div ref={setNodeRef} className="flex flex-col bg-card/50 border border-border rounded-lg h-full w-[300px] flex-shrink-0">
            <div className="p-3 font-semibold text-center text-white rounded-t-lg sticky top-0 z-10 flex items-center justify-center gap-2" style={{ backgroundColor: stage.color }}>
                {selectionMode && (
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => onToggleSelectAll?.(columnClientIds, !!checked)}
                    disabled={columnClientIds.length === 0}
                  />
                )}
                {stage.name} ({clients.length})
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-2">
                <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {clients.map(client => (
                        <DraggableClientCard
                          key={client.id}
                          client={client}
                          selectionMode={selectionMode}
                          isSelected={selectedClientIds?.has(client.id)}
                          onToggleSelect={() => onToggleSelect?.(client.id)}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}


const LAST_FUNNEL_STORAGE_KEY = 'pipeline:lastFunnelId';

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
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>(undefined);
  const [newClientForm, setNewClientForm] = useState({ fullName: "", phone: "", email: "", selectedbrokerId: "", selectedStageId: "" });
  const [newStageForm, setNewStageForm] = useState({ name: "", color: "#010f27" });
  const [editingStages, setEditingStages] = useState<FunnelStage[]>([]);

  const [filters, setFilters] = useState<{
    searchTerm: string;
    status: ClientOverallStatus | 'all';
    dateRange: DateRange | undefined;
    brokerId: string;
    managerId: string;
    tagId: string;
  }>({
    searchTerm: '',
    status: ClientOverallStatus.ACTIVE,
    dateRange: undefined as DateRange | undefined,
    brokerId: 'all',
    managerId: 'all',
    tagId: 'all',
  });

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

      const [clientsRes, funnelsRes, brokersRes, tagsRes, rolesRes] = await Promise.all([
        fetch('/api/clients'),
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
  }, [toast, selectedFunnelId]);

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

      const matchesStatus = filters.status.toString() === 'all' || client.overallStatus === filters.status;

      const matchesBroker = filters.brokerId === 'all' || client.brokerId === filters.brokerId;

      const matchesManager = !teamBrokerIds || teamBrokerIds.includes(client.brokerId);

      const matchesDate = !filters.dateRange?.from || (
        new Date(client.createdAt) >= filters.dateRange.from &&
        new Date(client.createdAt) <= (filters.dateRange.to || filters.dateRange.from)
      );

      const matchesTag = filters.tagId === 'all' || client.tags?.some(tag => tag.id === filters.tagId);

      return matchesSearch && matchesStatus && matchesBroker && matchesManager && matchesDate && matchesTag;
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
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    if (over && over.data.current?.isContainer && active.data.current?.stageId !== over.id.toString() && selectedFunnel) {
        const originalClients = [...allClients];
        const newStageId = over.id as string; // Este é o ID da etapa de destino
        const newFunnelId = selectedFunnel.id; // ID do funil atualmente selecionado
        
        // Atualiza o estado local para refletir a mudança imediatamente
        setAllClients(prev => prev.map(c => 
            c.id === active.id 
                ? { ...c, funnelId: newFunnelId, funnelStageId: newStageId } 
                : c
        ));

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ funnelId: newFunnelId, funnelStageId: newStageId }),
            });
            if (!response.ok) throw new Error('Falha ao atualizar o status.');
            toast({ title: 'Sucesso!', description: 'Cliente movido para um novo estágio.' });
            // Opcional: fetchData() para re-sincronizar tudo, mas a UI já está atualizada.
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível mover o cliente.' });
            setAllClients(originalClients);
        }
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

  const handleDatePreset = (preset: 'today' | 'week' | 'month' | 'last_month') => {
    const today = startOfToday();
    let dateRange: DateRange | undefined;
    switch (preset) {
      case 'today':
        dateRange = { from: today, to: endOfToday() };
        break;
      case 'week':
        dateRange = { from: startOfWeek(today), to: endOfWeek(today) };
        break;
      case 'month':
        dateRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case 'last_month':
        dateRange = { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
        break;
    }
    setFilters(f => ({ ...f, dateRange }));
  };

  const handleStageUpdate = async (stage: FunnelStage) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/funnel-stages/${stage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: stage.name, color: stage.color }),
    });
    if (!response.ok) throw new Error('Falha ao atualizar estágio.');
  };

  const handleStageDelete = async (stageId: string) => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/funnel-stages/${stageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Falha ao deletar estágio.');
  };

  const handleAddStage = async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/funnel-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newStageForm),
    });
    if (!response.ok) throw new Error('Falha ao criar estágio.');
  };

  const onStageDelete = async (stageId: string) => {
    // O ideal seria adicionar um Dialog de confirmação aqui
    try {
        await handleStageDelete(stageId);
        toast({ title: 'Sucesso', description: 'Estágio deletado.' });
        setEditingStages(s => s.filter(i => i.id !== stageId));
        // Opcional: fetchData() para garantir a sincronia total
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao deletar', description: error.message });
    }
  };

  const onStageAdd = async () => {
    if (!newStageForm.name.trim()) {
        toast({ variant: 'destructive', title: 'Erro', description: 'O name do estágio não pode ser vazio.' });
        return;
    }
    try {
        await handleAddStage();
        toast({ title: 'Sucesso', description: 'Novo estágio adicionado.' });
        setNewStageForm({ name: "", color: "#010f27" });
        fetchData(); // Re-fetch para obter o novo estágio com seu ID do banco de dados
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao adicionar', description: error.message });
    }
  };

  const saveAllStageChanges = async () => {
    try {
        await Promise.all(editingStages.map(stage => handleStageUpdate(stage)));
        toast({ title: 'Sucesso!', description: 'Estágios atualizados.' });
        fetchData();
        setIsStageDialogOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar todos os estágios.' });
    }
  };

  if (loading) return <PipelineSkeleton />;

  const DateFilter = ({ inModal = false }: { inModal?: boolean }) => {
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
        const today = startOfToday();
        let range: DateRange | undefined;
        if (preset === 'today') range = { from: today, to: endOfToday() };
        else if (preset === 'week') range = { from: startOfWeek(today), to: endOfWeek(today) };
        else if (preset === 'month') range = { from: startOfMonth(today), to: endOfMonth(today) };
        else range = { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
        setPendingDateRange(range);
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
                variant={
                  activeRange?.from && activeRange?.to &&
                  format(activeRange.from, 'dd/MM') === format(startOfToday(), 'dd/MM') && p.key === 'today'
                    ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => applyPreset(p.key)}
                className="w-full text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Indicador de seleção */}
          {rangeLabel ? (
            <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-center font-medium">
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
            className="rounded-md border w-full mx-auto"
            numberOfMonths={1}
          />
        </div>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
            {filters.dateRange?.from && <X className="h-3 w-3 mr-1 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setFilters(f => ({ ...f, dateRange: undefined })); }} />}
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 flex" align="start">
          <div className="flex flex-col space-y-1 p-2 border-r min-w-[120px]">
            {presets.map(p => (
              <Button key={p.key} variant="ghost" size="sm" className="justify-start" onClick={() => handleDatePreset(p.key)}>{p.label}</Button>
            ))}
            {filters.dateRange?.from && (
              <Button variant="ghost" size="sm" className="justify-start text-destructive" onClick={() => setFilters(f => ({ ...f, dateRange: undefined }))}>
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
          <Calendar mode="range" selected={filters.dateRange} onSelect={date => setFilters(f => ({ ...f, dateRange: date }))} locale={ptBR} />
        </PopoverContent>
      </Popover>
    );
  };

  const FilterControls = ({ inModal = false }: { inModal?: boolean }) => (
    <div className={`flex ${inModal ? 'flex-col' : 'flex-wrap items-center'} gap-2`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email, telefone..." className={`pl-8 ${inModal ? 'w-full' : 'w-64'}`} value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} />
      </div>
      <Select value={String(filters.status)} onValueChange={(value) => setFilters(f => ({...f, status: value as ClientOverallStatus | 'all'}))}>
        <SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value={ClientOverallStatus.ACTIVE}>Em andamento</SelectItem>
          <SelectItem value={ClientOverallStatus.WON}>Ganho</SelectItem>
          <SelectItem value={ClientOverallStatus.LOST}>Perdido</SelectItem>
        </SelectContent>
      </Select>
      <DateFilter inModal={inModal} />
      {managers.length > 0 && (
        <Select value={filters.managerId} onValueChange={value => setFilters(f => ({ ...f, managerId: value, brokerId: 'all' }))}>
          <SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue placeholder="Equipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as equipes</SelectItem>
            {managers.map(m => <SelectItem key={m.id} value={m.id}>Equipe {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {isRoleActive('BROKER') && (
        <Select value={filters.brokerId} onValueChange={value => setFilters(f => ({ ...f, brokerId: value }))}>
          <SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue placeholder="Corretor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os corretores</SelectItem>
            {(filters.managerId !== 'all'
              ? brokers.filter(b => b.role === 'BROKER' && b.supervisorId === filters.managerId || b.id === user?.id)
              : brokers
            ).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={filters.tagId} onValueChange={value => setFilters(f => ({ ...f, tagId: value }))}>
        <SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue placeholder="Etiqueta" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as etiquetas</SelectItem>
          {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" className={inModal ? 'w-full' : ''} onClick={() => setFilters({ searchTerm: '', status: ClientOverallStatus.ACTIVE, dateRange: undefined, brokerId: 'all', managerId: 'all', tagId: 'all' })}>
        <X className="h-4 w-4 mr-2" />Limpar filtros
      </Button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="border-b bg-card flex-shrink-0">
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
                <h1 className="text-xl font-bold text-foreground">Pipeline de Vendas</h1>
                <Select value={selectedFunnelId || ''} onValueChange={selectFunnel}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione um funil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {funnels.map(funnel => <SelectItem key={funnel.id} value={funnel.id}>{funnel.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {user?.role === 'MARKETING_ADMIN' && (
                  <Link href="/settings/funnels">
                      <Button variant="outline" size="sm">
                          <Pencil className="h-3 w-3 mr-2" />
                          Gerenciar Funis
                      </Button>
                  </Link>
                )}
                {isMarketingAdmin && (
                  <Button
                    variant={selectionMode ? "secondary" : "outline"}
                    size="sm"
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
                      <Button><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
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
      <div className="p-4 border-b bg-card flex-shrink-0 hidden lg:flex">
        <FilterControls />
      </div>
      
      {/* Layout Desktop: Colunas do Funil */}
      <div className="flex-1 overflow-x-auto p-4 hidden lg:flex">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {funnelStages.map((stage) => (
              <FunnelColumn
                key={stage.id}
                stage={stage}
                clients={filteredClients.filter(c => c.funnelStageId === stage.id)}
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
        <Tabs defaultValue={funnelStages[0]?.id} className="flex-1 flex flex-col overflow-hidden">
          {/* Stage tabs — scroll horizontal sem barra visível */}
          <div
            className="no-scrollbar flex-shrink-0 bg-card border-b border-border overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <TabsList className="flex w-max bg-transparent rounded-none border-none shadow-none h-auto px-3 py-2 gap-1.5">
              {funnelStages.map((stage) => {
                const count = filteredClients.filter(c => c.funnelStageId === stage.id).length;
                return (
                  <TabsTrigger
                    key={stage.id}
                    value={stage.id}
                    className="flex-shrink-0 whitespace-nowrap rounded-full h-auto px-3.5 py-1.5 text-xs font-medium
                      border border-border/60 bg-card text-muted-foreground shadow-none
                      data-[state=active]:bg-secondary-custom data-[state=active]:text-primary-custom
                      data-[state=active]:border-secondary-custom data-[state=active]:shadow-sm
                      transition-all duration-200 gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                    <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-black/10 dark:bg-white/15 text-[9px] font-bold tabular-nums">
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
              const stageClients = filteredClients.filter(c => c.funnelStageId === stage.id);
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
                      ? stageClients.map(client => (
                          <MobileClientCard
                            key={client.id}
                            client={client}
                            selectionMode={selectionMode}
                            isSelected={selectedClientIds.has(client.id)}
                            onToggleSelect={() => toggleClientSelection(client.id)}
                          />
                        ))
                      : (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 opacity-40"
                            style={{ backgroundColor: stage.color + '30' }}
                          >
                            <User className="h-5 w-5" style={{ color: stage.color }} />
                          </div>
                          <p className="text-sm font-medium">Nenhum cliente</p>
                          <p className="text-xs mt-0.5 text-muted-foreground/60">Nesta etapa do funil</p>
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl p-3 flex items-center justify-between gap-3 flex-wrap">
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

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Editar Estágios do Funil: {selectedFunnel?.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  {editingStages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center gap-2 p-2 border rounded-lg">
                          <Input value={stage.name} onChange={e => setEditingStages(s => s.map(i => i.id === stage.id ? {...i, name: e.target.value} : i))} />
                          <Input type="color" value={stage.color} onChange={e => setEditingStages(s => s.map(i => i.id === stage.id ? {...i, color: e.target.value} : i))} className="w-12 h-10" />
                          <Button variant="ghost" size="icon" onClick={() => onStageDelete(stage.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                  ))}
                  <Separator />
                  <div className="flex items-center gap-2 p-2">
                      <Input placeholder="Nome do novo estágio" value={newStageForm.name} onChange={e => setNewStageForm({...newStageForm, name: e.target.value})} />
                      <Input type="color" value={newStageForm.color} onChange={e => setNewStageForm({...newStageForm, color: e.target.value})} className="w-12 h-10" />
                      <Button onClick={onStageAdd}>Adicionar</Button>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={saveAllStageChanges}>Salvar Todas as Alterações</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

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
            <FilterControls inModal={true} />
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
  )
}
