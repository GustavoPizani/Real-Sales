// app/(app)/pipeline/page.tsx
"use client";

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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Plus, MessageCircle, User, CalendarIcon, Phone, Mail, Search, X, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfToday, startOfWeek, startOfMonth, subMonths, endOfToday, endOfWeek, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Cliente, type User as Broker, Role, ClientOverallStatus } from "@/lib/types";
import { DateRange } from "react-day-picker";

// --- Tipos ---
interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

// --- Componente do Card Arrastável ---
function DraggableClientCard({ client }: { client: Cliente }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id, data: { stage: client.currentFunnelStage } });
  
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
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none bg-white border border-gray-200 hover:shadow-md mb-2"
      onClick={onClientClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-gray-900 text-sm">{client.nomeCompleto}</h4>
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {client.updatedAt ? format(new Date(client.updatedAt), "dd/MM/yy") : ''}
          </div>
        </div>
        {client.corretor && (
          <div className="flex items-center text-xs text-gray-600">
            <User className="h-3 w-3 text-gray-400 mr-1" />
            <span>{client.corretor.nome}</span>
          </div>
        )}
        {client.telefone && (
            <div className="flex items-center justify-between text-xs text-gray-700">
                <div className="flex items-center">
                    <Phone className="h-3 w-3 text-gray-400 mr-2" />
                    <span>{client.telefone}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-green-100" onClick={(e) => openWhatsApp(client.telefone!, e)}>
                    <MessageCircle className="h-3 w-3 text-green-600" />
                </Button>
            </div>
        )}
        {client.email && (
            <div className="flex items-center text-xs text-gray-700">
                <Mail className="h-3 w-3 text-gray-400 mr-2" />
                <span className="truncate">{client.email}</span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Componente da Coluna do Funil ---
function FunnelColumn({ stage, clients }: { stage: FunnelStage; clients: Cliente[] }) {
    const { setNodeRef } = useSortable({ id: stage.name, data: { isContainer: true } });
    return (
        <div ref={setNodeRef} className="flex flex-col bg-gray-100 rounded-lg h-full w-[280px] flex-shrink-0">
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
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClient, setActiveClient] = useState<Cliente | null>(null);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ nomeCompleto: "", telefone: "", email: "" });
  const [newStageForm, setNewStageForm] = useState({ name: "", color: "#010f27" });
  const [editingStages, setEditingStages] = useState<FunnelStage[]>([]);

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: ClientOverallStatus.Ativo,
    dateRange: undefined as DateRange | undefined,
    brokerId: 'all'
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("Token não encontrado");
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [clientsRes, stagesRes, brokersRes] = await Promise.all([
        fetch('/api/clients', { headers }),
        fetch('/api/funnel-stages', { headers }),
        fetch('/api/users', { headers })
      ]);

      if (!clientsRes.ok || !stagesRes.ok || !brokersRes.ok) throw new Error('Falha ao carregar dados do pipeline.');
      
      const clientsData = await clientsRes.json();
      const stagesData = await stagesRes.json();
      const brokersData = await brokersRes.json();

      setAllClients(clientsData.clients || []);
      const sortedStages = stagesData.sort((a: FunnelStage, b: FunnelStage) => a.order - b.order) || [];
      setFunnelStages(sortedStages);
      setEditingStages(sortedStages);
      setBrokers(brokersData.users || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      const searchTermLower = filters.searchTerm.toLowerCase();
      const matchesSearch = !filters.searchTerm ||
        client.nomeCompleto.toLowerCase().includes(searchTermLower) ||
        (client.email && client.email.toLowerCase().includes(searchTermLower)) ||
        (client.telefone && client.telefone.includes(filters.searchTerm));
      
      const matchesStatus = filters.status.toString() === 'all' || client.overallStatus === filters.status;
      
      const matchesBroker = filters.brokerId === 'all' || client.corretorId === filters.brokerId;

      const matchesDate = !filters.dateRange?.from || (
        new Date(client.createdAt) >= filters.dateRange.from &&
        new Date(client.createdAt) <= (filters.dateRange.to || filters.dateRange.from)
      );

      return matchesSearch && matchesStatus && matchesBroker && matchesDate;
    });
  }, [allClients, filters]);

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setActiveClient(allClients.find(c => c.id === active.id) || null);
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveClient(null);

    if (over && over.data.current?.isContainer && active.data.current?.stage !== over.id) {
        const originalClients = [...allClients];
        const newStatus = over.id as string;
        
        setAllClients(prev => prev.map(c => c.id === active.id ? { ...c, currentFunnelStage: newStatus } : c));

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentFunnelStage: newStatus }),
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
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                nomeCompleto: newClientForm.nomeCompleto, 
                telefone: newClientForm.telefone, 
                email: newClientForm.email,
                currentFunnelStage: funnelStages[0]?.name || 'Contato' 
            }),
        });
        if (!response.ok) throw new Error('Falha ao criar cliente.');
        toast({ title: 'Sucesso!', description: 'Novo cliente adicionado.' });
        setIsClientDialogOpen(false);
        setNewClientForm({ nomeCompleto: "", telefone: "", email: "" });
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
        toast({ variant: 'destructive', title: 'Erro', description: 'O nome do estágio não pode ser vazio.' });
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

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="p-4 border-b bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-900">Pipeline de Vendas</h1>
                {user?.role === 'marketing_adm' && (
                    <Button variant="outline" size="sm" onClick={() => setIsStageDialogOpen(true)}>
                        <Pencil className="h-3 w-3 mr-2" />
                        Editar Estágios do Funil
                    </Button>
                )}
            </div>
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar Novo Cliente</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                        <div><Label htmlFor="nomeCompleto">Nome Completo</Label><Input id="nomeCompleto" value={newClientForm.nomeCompleto} onChange={(e) => setNewClientForm(p => ({...p, nomeCompleto: e.target.value}))} required /></div>
                        <div><Label htmlFor="telefone">Telefone</Label><Input id="telefone" value={newClientForm.telefone} onChange={(e) => setNewClientForm(p => ({...p, telefone: e.target.value}))} /></div>
                        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={newClientForm.email} onChange={(e) => setNewClientForm(p => ({...p, email: e.target.value}))} /></div>
                        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsClientDialogOpen(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </header>
      
      <div className="p-4 border-b bg-white flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nome, email, telefone..." className="pl-8 w-64" value={filters.searchTerm} onChange={e => setFilters(f => ({...f, searchTerm: e.target.value}))} /></div>
            <Select value={String(filters.status)} onValueChange={(value) => setFilters(f => ({...f, status: value as ClientOverallStatus | 'all'}))}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os Status</SelectItem><SelectItem value={ClientOverallStatus.Ativo}>Em andamento</SelectItem><SelectItem value={ClientOverallStatus.Ganho}>Ganho</SelectItem><SelectItem value={ClientOverallStatus.Perdido}>Perdido</SelectItem></SelectContent></Select>
            <Popover><PopoverTrigger asChild><Button variant="outline" className="w-[240px] justify-start text-left font-normal">{filters.dateRange?.from ? `${format(filters.dateRange.from, "dd/MM/yy")} - ${filters.dateRange.to ? format(filters.dateRange.to, "dd/MM/yy") : ''}` : "Data de criação"}</Button></PopoverTrigger>
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
            <Select value={filters.brokerId} onValueChange={(value) => setFilters(f => ({...f, brokerId: value}))}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Corretor" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os corretores</SelectItem>{brokers.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select>
            <Button variant="ghost" onClick={() => setFilters({ searchTerm: '', status: ClientOverallStatus.Ativo, dateRange: undefined, brokerId: 'all' })}><X className="h-4 w-4 mr-2" />Limpar filtros</Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {funnelStages.map((stage) => (
              <FunnelColumn key={stage.id} stage={stage} clients={filteredClients.filter(c => c.currentFunnelStage === stage.name)} />
            ))}
          </div>
          <DragOverlay>
            {activeClient ? <DraggableClientCard client={activeClient} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
          <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Editar Estágios do Funil</DialogTitle></DialogHeader>
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
    </div>
  )
}