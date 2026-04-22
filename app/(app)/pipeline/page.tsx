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
import { Plus, MessageCircle, User, CalendarIcon, Phone, Mail, Search, X, Pencil, Trash2, Filter } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfToday, startOfWeek, startOfMonth, subMonths, endOfToday, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Cliente, type User as Broker, Role, ClientOverallStatus } from "@/lib/types";
import { DateRange } from "react-day-picker";
import { useMobileHeader } from "@/contexts/mobile-header-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// --- Componente do Card Arrastável ---
function DraggableClientCard({ client }: { client: Cliente }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id, data: { stageId: client.funnelStageId } });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onClientClick = () => router.push(`/client/${client.id}`);

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClientClick}
      className="cursor-grab active:cursor-grabbing touch-none mb-3 rounded-xl overflow-hidden group transition-all duration-200"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border) / 0.6)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(170,141,68,0.25)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 12px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.4)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Barra de cor do topo */}
      <div className="h-0.5 w-full bg-gradient-to-r from-secondary-custom/60 to-secondary-custom/10" />

      <div className="p-4 space-y-3">
        {/* Cabeçalho: tags + data */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {client.tags && client.tags.length > 0
              ? client.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: tag.color + '28', color: tag.color, border: `1px solid ${tag.color}55` }}
                  >
                    {tag.name}
                  </span>
                ))
              : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">Lead</span>
            }
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1 flex-shrink-0">
            <CalendarIcon className="h-3 w-3" />
            {client.updatedAt ? format(new Date(client.updatedAt), "dd/MM/yy") : ''}
          </span>
        </div>

        {/* Nome */}
        <p className="font-semibold text-foreground text-sm leading-snug">{client.fullName}</p>

        {/* Contatos */}
        {(client.phone || client.email) && (
          <div className="space-y-1.5 border-t border-border/50 pt-2">
            {client.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{client.phone}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 rounded-full hover:bg-green-500/15 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => openWhatsApp(client.phone!, e)}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                </Button>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{client.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Rodapé: corretor */}
        {client.BROKER && (
          <div className="flex items-center gap-2 border-t border-border/50 pt-2">
            <div className="h-5 w-5 rounded-full bg-secondary-custom/20 border border-secondary-custom/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-secondary-custom uppercase">
                {client.BROKER.name.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate">{client.BROKER.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Componente da Coluna do Funil ---
function FunnelColumn({ stage, clients }: { stage: FunnelStage; clients: Cliente[] }) {
    const { setNodeRef } = useSortable({ id: stage.id, data: { isContainer: true } });
    return (
        <div ref={setNodeRef} className="flex flex-col bg-card/50 border border-border rounded-lg h-full w-[300px] flex-shrink-0">
            <div className="p-3 font-semibold text-center text-white rounded-t-lg sticky top-0 z-10" style={{ backgroundColor: stage.color }}>
                {stage.name} ({clients.length})
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-2">
                <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {clients.map(client => (
                        <DraggableClientCard key={client.id} client={client} />
                    ))}
                </SortableContext>
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
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [roleSettings, setRoleSettings] = useState<{ roleName: string; isActive: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<Cliente | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
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
        fetch('/api/funnels'),
        fetch('/api/users'),
        fetch('/api/tags'),
        fetch('/api/role-settings'),
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
        setSelectedFunnelId(funnelsArray[0].id);
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

  const managers = useMemo(() => brokers.filter(b => b.role === Role.MANAGER), [brokers]);

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

  if (loading) return <p className="p-6">Carregando pipeline...</p>;

  const FilterControls = ({ inModal = false }: { inModal?: boolean }) => (
    <div className={`flex flex-wrap items-center gap-2 ${inModal ? 'flex-col' : ''}`}>
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por name, email, phone..." className={`pl-8 ${inModal ? 'w-full' : 'w-64'}`} value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} />
        </div>
        <Select value={String(filters.status)} onValueChange={(value) => setFilters(f => ({...f, status: value as ClientOverallStatus | 'all'}))}>
            <SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value={ClientOverallStatus.ACTIVE}>Em andamento</SelectItem>
                <SelectItem value={ClientOverallStatus.Ganho}>Ganho</SelectItem>
                <SelectItem value={ClientOverallStatus.Perdido}>Perdido</SelectItem>
            </SelectContent>
        </Select>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={`${inModal ? 'w-full' : 'w-[240px]'} justify-start text-left font-normal`}>{filters.dateRange?.from ? `${format(filters.dateRange.from, "dd/MM/yy")} - ${filters.dateRange.to ? format(filters.dateRange.to, "dd/MM/yy") : ''}` : "Data de criação"}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 flex" align="start">
                <div className="flex flex-col space-y-1 p-2 border-r min-w-[120px]">
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleDatePreset('today')}>Hoje</Button>
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleDatePreset('week')}>Esta semana</Button>
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleDatePreset('month')}>Este mês</Button>
                    <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleDatePreset('last_month')}>Mês passado</Button>
                </div>
                <Calendar mode="range" selected={filters.dateRange} onSelect={date => setFilters(f => ({...f, dateRange: date}))} locale={ptBR} />
            </PopoverContent>
        </Popover>
        {isRoleActive('MANAGER') && managers.length > 0 && (
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
                ? brokers.filter(b => b.role === 'BROKER' && b.supervisorId === filters.managerId)
                : brokers.filter(b => b.role === 'BROKER')
              ).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filters.tagId} onValueChange={value => setFilters(f => ({ ...f, tagId: value }))}><SelectTrigger className={inModal ? 'w-full' : 'w-[180px]'}><SelectValue placeholder="Etiqueta" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as etiquetas</SelectItem>{tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
        <Button variant="ghost" onClick={() => setFilters({ searchTerm: '', status: ClientOverallStatus.ACTIVE, dateRange: undefined, brokerId: 'all', managerId: 'all', tagId: 'all' })}><X className="h-4 w-4 mr-2" />Limpar filtros</Button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="p-4 border-b bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-foreground hidden sm:block">Pipeline de Vendas</h1>
                <Select value={selectedFunnelId || ''} onValueChange={setSelectedFunnelId}>
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
            </div>
            <div className="hidden lg:block">
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
                        {isRoleActive('BROKER') && user && ['MARKETING_ADMIN', 'diretor', 'gerente', 'pre_vendas'].includes(user.role as Role) && (
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
              <FunnelColumn key={stage.id} stage={stage} clients={filteredClients.filter(c => c.funnelStageId === stage.id)} />
            ))}
          </div>
          <DragOverlay>
            {activeClient ? <DraggableClientCard client={activeClient} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Layout Mobile: Abas */}
      <div className="block lg:hidden flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue={funnelStages[0]?.name} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 flex-shrink-0">
            <TabsList className="w-full overflow-x-auto justify-start">
              {funnelStages.map((stage) => (
                <TabsTrigger key={stage.id} value={stage.id}>
                  {stage.name} ({filteredClients.filter(c => c.funnelStageId === stage.id).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto">
            {funnelStages.map((stage) => (
              <TabsContent key={stage.id} value={stage.id} className="p-4 space-y-2">
                {filteredClients
                  .filter(c => c.funnelStageId === stage.id)
                  .map(client => (
                    <DraggableClientCard key={client.id} client={client} />
                  ))}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      {/* FAB para Novo Cliente em Mobile */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <Button size="icon" className="h-14 w-14 rounded-full bg-primary-custom text-white shadow-lg hover:bg-primary-custom/90" onClick={() => setIsClientDialogOpen(true)}>
          <Plus className="h-6 w-6" />
          <span className="sr-only">Novo Cliente</span>
        </Button>
      </div>

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
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtros</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <FilterControls inModal={true} />
          </div>
          <DialogFooter><Button onClick={() => setIsFilterDialogOpen(false)} className="w-full">Aplicar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
