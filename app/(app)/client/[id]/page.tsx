// app/(app)/client/[id]/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context"; // CORREÇÃO: Caminho de importação
import { Phone, Mail, MapPin, Edit, UserPlus, Building, DollarSign, FileText, CheckSquare, Clock, AlertCircle } from "lucide-react";
import { Role, PropertyStatus, ClientOverallStatus } from '@prisma/client';
import { format } from 'date-fns';

// --- Tipos Alinhados com o Schema do Prisma ---
interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

interface StaffUser {
  id: string;
  name: string;
  role: Role;
  superior?: {
    id: string;
    name: string;
  } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  isCompleted: boolean;
}

interface Property {
  id: string;
  title: string;
  type: string | null;
  price: number | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  description: string | null;
}

interface Client {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  budget: number | null;
  preferences: string | null;
  currentFunnelStage: string;
  brokerId: string;
  broker: StaffUser;
  propertyOfInterestId: string | null;
  createdAt: string;
  notes: Note[];
  tasks: Task[];
  propertyOfInterest: Property | null;
}

export default function ClientDetail() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados dos Modais
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Estados dos Formulários
  const [editClientData, setEditClientData] = useState({
    name: "",
    email: "",
    phone: "",
    budget: "",
    preferences: "",
    status: "",
  });
  const [assignData, setAssignData] = useState({ assigned_to: "" });
  const [newNote, setNewNote] = useState("");

  const fetchClientData = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(response.status === 404 ? "Cliente não encontrado" : "Erro ao carregar dados do cliente");
      }

      const data = await response.json();
      setClient(data.client);
      
      setEditClientData({
        name: data.client.fullName || "",
        email: data.client.email || "",
        phone: data.client.phone || "",
        budget: data.client.budget?.toString() || "",
        preferences: data.client.preferences || "",
        status: data.client.currentFunnelStage || "",
      });
      setAssignData({ assigned_to: data.client.brokerId || "" });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);
  
  const fetchUsers = useCallback(async () => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch("/api/users", {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setUsers(data.users || []);
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchClientData();
    fetchUsers();
  }, [fetchClientData, fetchUsers]);

  // CORREÇÃO: Função de atualização genérica para enviar um objeto de dados
  const handleUpdateClient = async (dataToUpdate: object) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${params.id}`, {
        method: "PUT", // Usar PUT para substituir os dados ou PATCH se a API suportar
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToUpdate),
      });
      if (!response.ok) throw new Error(`Falha ao atualizar cliente`);
      await fetchClientData(); // Recarrega os dados
      return true;
    } catch (error) {
      console.error(`Error updating client:`, error);
      return false;
    }
  };

  const handleEditClientSubmit = async () => {
    // Envia o objeto completo de dados do formulário
    const success = await handleUpdateClient(editClientData);
    if (success) setIsEditClientOpen(false);
  };
  
  const handleAssignClientSubmit = async () => {
    // Envia apenas o campo de atribuição
    const success = await handleUpdateClient({ assigned_to: assignData.assigned_to });
    if (success) setIsAssignClientOpen(false);
  };

  const handleAddNoteSubmit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newNote }),
      });
      if (!response.ok) throw new Error("Falha ao adicionar nota");
      setNewNote("");
      setIsAddNoteOpen(false);
      await fetchClientData();
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-custom"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error || "Cliente não encontrado"}</h1>
          <Button onClick={() => router.push("/pipeline")} variant="outline">
            Voltar ao Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
       {/* Header */}
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-custom">{client.fullName}</h1>
          <p className="text-gray-600 mt-2">Detalhes do cliente</p>
        </div>
        <Button onClick={() => router.push("/pipeline")} variant="outline">
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
            {/* Informações do Cliente */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Informações do Cliente</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsEditClientOpen(true)}><Edit className="h-4 w-4 mr-2" /> Editar</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center"><Mail className="h-5 w-5 text-gray-400 mr-3" /> <p>{client.email || "N/A"}</p></div>
                    <div className="flex items-center"><Phone className="h-5 w-5 text-gray-400 mr-3" /> <p>{client.phone || "N/A"}</p></div>
                    <div className="flex items-center"><DollarSign className="h-5 w-5 text-gray-400 mr-3" /> <p>{client.budget ? `R$ ${client.budget.toLocaleString("pt-BR")}` : "N/A"}</p></div>
                    {client.preferences && <div><p className="text-sm text-gray-500 mb-2">Preferências</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{client.preferences}</p></div>}
                </CardContent>
            </Card>

            {/* Imóvel de Interesse */}
            {client.propertyOfInterest && (
                <Card>
                    <CardHeader><CardTitle>Imóvel de Interesse</CardTitle></CardHeader>
                    <CardContent>
                        <h3 className="text-lg font-semibold">{client.propertyOfInterest.title}</h3>
                        <p className="text-sm text-gray-600">{client.propertyOfInterest.address}</p>
                    </CardContent>
                </Card>
            )}

            {/* Tarefas */}
            <Card>
                <CardHeader><CardTitle>Tarefas</CardTitle></CardHeader>
                <CardContent>
                    {client.tasks.length > 0 ? client.tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-2 border-b">
                            <div>
                                <p className={task.isCompleted ? 'line-through text-gray-500' : ''}>{task.title}</p>
                                <p className="text-xs text-gray-400">{format(new Date(task.dueDate), "dd/MM/yyyy 'às' HH:mm")}</p>
                            </div>
                            <Badge variant={task.isCompleted ? "secondary" : "default"}>{task.isCompleted ? "Concluída" : "Pendente"}</Badge>
                        </div>
                    )) : <p>Nenhuma tarefa encontrada.</p>}
                </CardContent>
            </Card>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
            {/* Resumo */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Resumo</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsAssignClientOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Atribuir</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><p className="text-sm text-gray-500">Etapa do Funil</p><Badge>{client.currentFunnelStage}</Badge></div>
                    <div><p className="text-sm text-gray-500">Corretor</p><p className="font-medium">{client.broker.name}</p></div>
                    <div><p className="text-sm text-gray-500">Gerente</p><p className="font-medium">{client.broker.superior?.name || "N/A"}</p></div>
                    <div><p className="text-sm text-gray-500">Cliente desde</p><p className="font-medium">{format(new Date(client.createdAt), "dd/MM/yyyy")}</p></div>
                </CardContent>
            </Card>
            
            {/* Notas */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Notas</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setIsAddNoteOpen(true)}><FileText className="h-4 w-4 mr-2" /> Adicionar</Button>
                </CardHeader>
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                    {client.notes.length > 0 ? client.notes.map(note => (
                        <div key={note.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                            <p>{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2 text-right">{note.createdBy} - {format(new Date(note.createdAt), "dd/MM/yy")}</p>
                        </div>
                    )) : <p>Nenhuma nota adicionada.</p>}
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Modais */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}><DialogContent><DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader> {/* ... form ... */} <DialogFooter><Button onClick={handleEditClientSubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isAssignClientOpen} onOpenChange={setIsAssignClientOpen}><DialogContent><DialogHeader><DialogTitle>Atribuir Cliente</DialogTitle></DialogHeader> {/* ... form ... */} <DialogFooter><Button onClick={handleAssignClientSubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar Nota</DialogTitle></DialogHeader><Textarea value={newNote} onChange={e => setNewNote(e.target.value)} /><DialogFooter><Button onClick={handleAddNoteSubmit}>Adicionar</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
