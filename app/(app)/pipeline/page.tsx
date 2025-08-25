"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DndContext, type DragEndEvent, type DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Plus, MessageCircle, Building, Search, Mail, User, CalendarIcon, Phone, Filter, X } from "lucide-react"
import { type Client, type Property, type User as UserType } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"

// Interface para as etapas do funil que vêm da API
interface FunnelStage {
  id: string;
  name: string;
  order: number;
  color: string;
}

// Opções de período pré-definido
const DATE_PRESETS = [
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "this_week" },
  { label: "Este mês", value: "this_month" },
  { label: "Últimos 7 dias", value: "last_7_days" },
  { label: "Últimos 14 dias", value: "last_14_days" },
  { label: "Últimos 30 dias", value: "last_30_days" },
  { label: "Últimos 6 meses", value: "last_6_months" },
  { label: "Período personalizado", value: "custom" },
]

// Componente do Card Arrastável
function DraggableClientCard({ client }: { client: Client }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: client.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const onClientClick = () => {
    router.push(`/client/${client.id}`);
  }

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`, "_blank");
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none bg-white border border-gray-200"
      onClick={onClientClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-gray-900 text-sm">{client.full_name}</h4>
          <div className="flex items-center text-xs text-gray-500">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {client.updated_at ? format(new Date(client.updated_at), "dd/MM/yy") : ''}
          </div>
        </div>
        {client.assigned_user && (
          <div className="flex items-center text-xs text-gray-600">
            <User className="h-3 w-3 text-gray-400 mr-1" />
            <span>{client.assigned_user.name}</span>
          </div>
        )}
        {client.phone && (
            <div className="flex items-center justify-between text-xs text-gray-700">
                <div className="flex items-center">
                    <Phone className="h-3 w-3 text-gray-400 mr-2" />
                    <span>{client.phone}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-green-100" onClick={(e) => openWhatsApp(client.phone!, e)}>
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
  )
}

// Componente Principal da Página
export default function PipelinePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ full_name: "", phone: "", email: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [clientsRes, stagesRes, usersRes] = await Promise.all([
        fetch('/api/clients', { headers }),
        fetch('/api/funnel-stages', { headers }),
        fetch('/api/users', { headers })
      ]);

      if (!clientsRes.ok || !stagesRes.ok || !usersRes.ok) throw new Error('Falha ao carregar dados.');
      
      const clientsData = await clientsRes.json();
      const stagesData = await stagesRes.json();
      const usersData = await usersRes.json();

      setClients(clientsData.clients || []);
      setFunnelStages(stagesData.stages || []);
      setUsers(usersData.users || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados do pipeline.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
        const originalClients = [...clients];
        const clientToMove = originalClients.find(c => c.id === active.id);
        if (!clientToMove) return;

        const oldStatus = clientToMove.funnel_status;
        const newStatus = over.id as string; // O ID da coluna é o nome do estágio
        
        setClients(prev => prev.map(c => c.id === active.id ? { ...c, funnel_status: newStatus } : c));

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/clients/${active.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ funnel_status: newStatus }),
            });
            if (!response.ok) throw new Error('Falha ao atualizar o status.');
            toast({ title: 'Sucesso!', description: 'Status do cliente atualizado.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
            setClients(originalClients); // Reverte em caso de erro
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
            body: JSON.stringify({ ...newClientForm, funnel_status: funnelStages[0]?.name || 'Contato' }),
        });
        if (!response.ok) throw new Error('Falha ao criar cliente.');
        toast({ title: 'Sucesso!', description: 'Novo cliente adicionado ao pipeline.' });
        setIsDialogOpen(false);
        setNewClientForm({ full_name: "", phone: "", email: "" });
        fetchData();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível criar o cliente.' });
    }
  };

  if (loading) return <p className="p-6">A carregar pipeline...</p>;

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
          <p className="text-gray-600">Gerencie os seus clientes através do funil de vendas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Novo Cliente</DialogTitle></DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" value={newClientForm.full_name} onChange={(e) => setNewClientForm(p => ({...p, full_name: e.target.value}))} required />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={newClientForm.phone} onChange={(e) => setNewClientForm(p => ({...p, phone: e.target.value}))} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={newClientForm.email} onChange={(e) => setNewClientForm(p => ({...p, email: e.target.value}))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Cliente</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={e => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
          <div className="grid grid-flow-col auto-cols-fr gap-4 h-full">
            {funnelStages.map((stage) => (
              <div key={stage.id} id={stage.name} className="flex flex-col bg-gray-200 rounded-lg">
                <div className="p-3 font-semibold text-center text-white rounded-t-lg" style={{ backgroundColor: stage.color }}>{stage.name}</div>
                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  <SortableContext items={clients.filter(c => c.funnel_status === stage.name).map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {clients.filter(c => c.funnel_status === stage.name).map(client => (
                        <DraggableClientCard key={client.id} client={client} />
                      ))}
                  </SortableContext>
                </div>
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeId ? <DraggableClientCard client={clients.find(c => c.id === activeId)!} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
