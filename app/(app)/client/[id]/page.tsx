"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Mail, Calendar, User, MessageCircle, Plus, CheckCircle, XCircle, ArrowUpDown, Pencil, Loader2, AlertTriangle, Users, Sparkles, Save
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import { format, addHours } from "date-fns";
import { type Cliente, type Imovel, ClientOverallStatus, type Nota, type Tarefa, type Usuario } from "@/lib/types";

// --- Tipos e Constantes ---

type RiaModalState = 'initial' | 'loading' | 'suggestion' | 'closed';

const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

// --- Componente Principal ---

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-custom mb-4" />
        <p className="text-muted-foreground">A carregar cliente...</p>
      </div>
    );
  }

  return <ClientDetailsContent clientId={clientId} />;
}

// --- Componente de Conteúdo ---

function ClientDetailsContent({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();

  // --- Estados ---
  const [client, setClient] = useState<Cliente | null>(null);
  const [properties, setProperties] = useState<Imovel[]>([]);
  const [funnelStages, setFunnelStages] = useState<any[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [lostReasons, setLostReasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados dos Modais
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [isFunnelDialogOpen, setIsFunnelDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isEditPropertyDialogOpen, setIsEditPropertyDialogOpen] = useState(false);
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  
  // --- Hook e Estados da RIA ---
  const { messages, append, isLoading: isRiaLoading, setMessages } = useChat({
    api: `/api/clients/${clientId}/ria-suggestion`,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro na RIA",
        description: error.message,
      });
    },
  });

  const [isRiaDialogOpen, setIsRiaDialogOpen] = useState(false);  
  const riaSuggestion = messages.find(m => m.role === 'assistant')?.content || '';

  // Estados dos Formulários
  const [wonDetails, setWonDetails] = useState({ sale_value: "", sale_date: "" });
  const [lostDetails, setLostDetails] = useState({ reason: "", feedback: "" });
  const [newFunnelStatus, setNewFunnelStatus] = useState("");
  const [newNote, setNewNote] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", description: "", dataHora: "" });
  const [editClientForm, setEditClientForm] = useState({ nomeCompleto: "", email: "", telefone: "" });
  const [newPropertyId, setNewPropertyId] = useState("");
  const [transferToUserId, setTransferToUserId] = useState("");
  const [visitDateTime, setVisitDateTime] = useState("");
  const [activeTab, setActiveTab] = useState("anotacoes");

  // --- Funções de Busca e Atualização de Dados ---

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [clientRes, stagesRes, reasonsRes, propertiesRes, usersRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`, { headers }),
        fetch('/api/funnel-stages', { headers }),
        fetch('/api/lost-reasons', { headers }),
        fetch('/api/properties', { headers }),
        fetch('/api/users', { headers })
      ]);

      if (!clientRes.ok) throw new Error("Cliente não encontrado ou erro na API");

      const clientData = await clientRes.json();
      const stagesData = await stagesRes.json();
      const reasonsData = await reasonsRes.json();
      const propertiesData = await propertiesRes.json();
      const usersData = await usersRes.json();

      setClient(clientData.client);
      setUsers(usersData.users || []);
      setFunnelStages(stagesData || []);
      setLostReasons(reasonsData.reasons || []);
      setProperties(propertiesData || []);

      if (clientData.client) {
        setNewFunnelStatus(clientData.client.currentFunnelStage);
        setEditClientForm({
            nomeCompleto: clientData.client.nomeCompleto,
            email: clientData.client.email || "",
            telefone: clientData.client.telefone || ""
        });
        setNewPropertyId(clientData.client.imovelDeInteresseId || "");
      }
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: "Erro ao carregar dados", description: err.message });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateClient = async (payload: object, options?: { successMessage?: string }) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar cliente.');
      }
      toast({ title: "Sucesso!", description: options?.successMessage || "Cliente atualizado com sucesso." });
      fetchData();
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return false;
    }
  };

  // --- Handlers de Ações ---

  const handleEditClientSubmit = async () => {
    const success = await handleUpdateClient(editClientForm, { successMessage: "Dados do cliente atualizados." });
    if (success) setIsEditClientDialogOpen(false);
  };
  
  const handleEditPropertySubmit = async () => {
    const success = await handleUpdateClient({ imovelDeInteresseId: newPropertyId }, { successMessage: "Imóvel de interesse atualizado." });
    if (success) setIsEditPropertyDialogOpen(false);
  };

  const handleTransferLead = async () => {
    if (!transferToUserId) return;
    const success = await handleUpdateClient({ corretorId: transferToUserId }, { successMessage: "Lead transferido com sucesso." });
    if (success) setIsTransferDialogOpen(false);
  };

  const handleOpenRiaModal = () => {
    setMessages([]); // Limpa mensagens anteriores ao abrir
    setIsRiaDialogOpen(true);
  };

  const handleFetchRiaSuggestions = async () => {
    if (!client) return;
    
    // O hook `useChat` precisa de uma mensagem para iniciar a conversa.
    // O conteúdo real que a IA vai usar já é enviado no `body`.
    await append({
      role: 'user',
      content: 'Gerar sugestão', // Este texto é apenas um gatilho, não é usado pela IA.
    }, {
      body: {
        clientName: client.nomeCompleto,
        notes: client.notas,
        tasks: client.tarefas,
      }
    });
  };

  const handleSaveRiaSuggestionAsNote = async () => {
    if (!riaSuggestion) return;
    const success = await handleAddNote(riaSuggestion);
    if (success) {
        toast({ title: "Sucesso!", description: "Sugestão da RIA salva como anotação." });
        setIsRiaDialogOpen(false);
    }
  };

  const handleScheduleVisit = () => {
    if (!visitDateTime || !client?.imovelDeInteresse || !client.email) {
      toast({ variant: "destructive", title: "Erro", description: "Data, imóvel de interesse e email do cliente são necessários." });
      return;
    }
    const startDate = new Date(visitDateTime);
    const endDate = addHours(startDate, 1);
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = `Visita ao empreendimento ${client.imovelDeInteresse.titulo}`;
    const location = client.imovelDeInteresse.endereco;
    const details = `Visita agendada com o cliente ${client.nomeCompleto} para conhecer o imóvel ${client.imovelDeInteresse.titulo}. Lembretes adicionados para 30 minutos e 1 dia antes.`;
    const url = [ "https://www.google.com/calendar/render?action=TEMPLATE", `text=${encodeURIComponent(title)}`, `dates=${formatDate(startDate)}/${formatDate(endDate)}`, `details=${encodeURIComponent(details)}`, `location=${encodeURIComponent(location || '')}`, `add=${encodeURIComponent(client.email)}`, "reminders=30", "reminders=1440" ].join("&");
    window.open(url, "_blank");
    setIsScheduleVisitOpen(false);
  };

  const handleMarkAsWon = async () => {
    const success = await handleUpdateClient({ overallStatus: ClientOverallStatus.Ganho, currentFunnelStage: "Ganho", detalhesDeVenda: { sale_value: parseFloat(wonDetails.sale_value), sale_date: new Date(wonDetails.sale_date), } }, { successMessage: "Cliente marcado como 'Ganho'!" });
    if (success) setIsWonDialogOpen(false);
  };

  const handleMarkAsLost = async () => {
    if (!lostDetails.reason || !lostDetails.feedback) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Por favor, selecione um motivo e forneça um feedback." });
      return;
    }
    const noteContent = `Cliente marcado como perdido.\nMotivo: ${lostDetails.reason}\nFeedback: ${lostDetails.feedback}`;
    
    // Primeiro, atualiza o status do cliente
    const updateSuccess = await handleUpdateClient({ overallStatus: ClientOverallStatus.Perdido, currentFunnelStage: "Perdido" }, { successMessage: "Cliente marcado como 'Perdido'." });
    
    // Se o status foi atualizado, adiciona a anotação com os detalhes
    if (updateSuccess) {
      await handleAddNote(noteContent); // Adiciona a anotação
      setIsLostDialogOpen(false); // Fecha o modal
    }
  };

  const handleChangeFunnelStatus = async () => {
    const success = await handleUpdateClient({ currentFunnelStage: newFunnelStatus }, { successMessage: "Etapa do funil alterada." });
    if (success) setIsFunnelDialogOpen(false);
  };

  const handleAddNote = async (content: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${clientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Falha ao adicionar anotação.");
      toast({ title: "Sucesso!", description: "Anotação adicionada." });
      setNewNote("");
      setIsNoteDialogOpen(false);
      fetchData();
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return false;
    }
  };

  const handleAddNoteFromForm = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddNote(newNote);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: taskForm.title, description: taskForm.description, dataHora: new Date(taskForm.dataHora), clienteId: clientId }),
      });
      if (!response.ok) throw new Error("Falha ao criar tarefa.");
      toast({ title: "Sucesso!", description: "Tarefa criada." });
      setIsTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", dataHora: "" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleRiaDialogClose = () => {
    setIsRiaDialogOpen(false);
    setMessages([]); // Limpa as mensagens ao fechar
  }

  // --- Funções Auxiliares ---

  const getStatusProps = (status: string): { className?: string; style?: React.CSSProperties } => {
    if (status === ClientOverallStatus.Ganho) return { className: "bg-emerald-100 text-emerald-800" };
    if (status === ClientOverallStatus.Perdido) return { className: "bg-red-100 text-red-800" };
    const stage = funnelStages.find(s => s.name === status);
    if (stage?.color) return { style: { color: stage.color, backgroundColor: `${stage.color}1A` } };
    return { className: "bg-gray-100 text-gray-800" };
  };

  // --- Renderização ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-custom mb-4" />
        <p className="text-muted-foreground">A carregar dados do cliente...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Cliente</h2>
        <p className="text-muted-foreground mb-4">{error || "O cliente que procura não foi encontrado."}</p>
        <Button onClick={() => router.push("/pipeline")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para o Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/pipeline")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.nomeCompleto}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge {...getStatusProps(client.currentFunnelStage)}>{client.currentFunnelStage}</Badge>
              <span className="text-sm text-gray-600">Corretor: {client.corretor?.nome}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {client.overallStatus === ClientOverallStatus.Ativo && (
            <>
              <Button variant="outline" className="text-green-600 hover:text-green-700 flex-grow sm:flex-grow-0" onClick={() => setIsWonDialogOpen(true)}><CheckCircle className="h-4 w-4 mr-2" /> Cliente Ganho</Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700 flex-grow sm:flex-grow-0" onClick={() => setIsLostDialogOpen(true)}><XCircle className="h-4 w-4 mr-2" /> Cliente Perdido</Button>
            </>
          )}
        </div>
      </div>

      {/* Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda (Principal) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Abas para Mobile: Informações e Ações Rápidas */}
          <div className="lg:hidden">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="actions">Ações Rápidas</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="mt-4">
                <Card>
                  <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Nome Completo</Label><p className="font-medium">{client.nomeCompleto}</p></div>
                    <div><Label>Telefone</Label><p className="font-medium">{client.telefone || "N/A"}</p></div>
                    <div><Label>Email</Label><p className="font-medium">{client.email || "N/A"}</p></div>
                    <div><Label>Data de Cadastro</Label><p className="font-medium">{format(new Date(client.createdAt), "dd/MM/yyyy")}</p></div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="actions" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => setIsEditClientDialogOpen(true)}><Pencil className="h-4 w-4 mr-2"/>Editar Cliente</Button>
                    <Button variant="outline" className="w-full justify-start" asChild><a href={`mailto:${client.email}`}><Mail className="h-4 w-4 mr-2"/>Enviar E-mail</a></Button>
                    <Button variant="outline" className="w-full justify-start" asChild><a href={`https://wa.me/55${client.telefone?.replace(/\D/g, '')}`} target="_blank"><MessageCircle className="h-4 w-4 mr-2"/>Enviar WhatsApp</a></Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setIsTransferDialogOpen(true)}><Users className="h-4 w-4 mr-2"/>Transferir Lead</Button>
                    <Button variant="outline" type="button" onClick={handleOpenRiaModal} className="w-full justify-start" disabled={isRiaLoading}>
                      <Sparkles className="h-4 w-4 mr-2 text-primary-custom"/>
                      {isRiaLoading ? "Analisando..." : "Sugestão da RIA"}
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setIsScheduleVisitOpen(true)}><Calendar className="h-4 w-4 mr-2"/>Agendar Visita</Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setIsFunnelDialogOpen(true)}><ArrowUpDown className="h-4 w-4 mr-2"/>Alterar Etapa do Funil</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Card de Informações para Desktop */}
          <Card className="hidden lg:block">
            <CardHeader><CardTitle>Informações do Cliente</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Nome Completo</Label><p className="font-medium">{client.nomeCompleto}</p></div>
                <div><Label>Telefone</Label><p className="font-medium">{client.telefone || "N/A"}</p></div>
                <div><Label>Email</Label><p className="font-medium">{client.email || "N/A"}</p></div>
                <div><Label>Data de Cadastro</Label><p className="font-medium">{format(new Date(client.createdAt), "dd/MM/yyyy")}</p></div>
            </CardContent>
          </Card>

          {/* Card de Imóvel de Interesse (Movido para cá) */}
          <Card>
            <CardHeader><CardTitle>Imóvel de Interesse</CardTitle></CardHeader>
            <CardContent>
              {client.imovelDeInteresse ? (
                <>
                  <h3 className="font-semibold">{client.imovelDeInteresse.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{client.imovelDeInteresse.endereco || "Endereço não disponível"}</p>
                  <p className="font-bold mt-2">{formatCurrency(client.imovelDeInteresse.preco)}</p>
                  <Button variant="outline" className="w-full mt-4" onClick={() => router.push(`/properties/${client.imovelDeInteresseId}`)}>Ver Detalhes</Button>
                  <Button variant="outline" className="w-full mt-2" onClick={() => setIsEditPropertyDialogOpen(true)}>Editar Imóvel de Interesse</Button>
                </>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setIsEditPropertyDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Inserir Imóvel de Interesse</Button>
              )}
            </CardContent>
          </Card>

          {/* Card de Histórico e Atividades */}
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Histórico e Atividades</CardTitle>
              <Button size="sm" onClick={() => activeTab === 'tarefas' ? setIsTaskDialogOpen(true) : setIsNoteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {activeTab === 'tarefas' ? 'Nova Tarefa' : 'Nova Anotação'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="anotacoes" onValueChange={setActiveTab} className="w-full">
                <div className="px-4 sm:px-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
                    <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="tarefas" className="p-4 sm:p-6 pt-4">
                  <Table>
                    <TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Data/Hora</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {client.tarefas?.length > 0 ? client.tarefas.map(task => (<TableRow key={task.id}><TableCell>{task.titulo}</TableCell><TableCell>{format(new Date(task.dataHora), "dd/MM/yy HH:mm")}</TableCell><TableCell><Badge variant={task.concluida ? "secondary" : "default"}>{task.concluida ? "Concluída" : "Pendente"}</Badge></TableCell></TableRow>)) : <TableRow><TableCell colSpan={3} className="text-center">Nenhuma tarefa.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="anotacoes" className="p-4 sm:p-6 pt-4">
                  <div className="space-y-4">
                    {client.notas && client.notas.length > 0 ? (
                      client.notas
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((note) => (
                          <Card key={note.id} className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                  <User className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className="flex flex-col">
                                  <CardTitle className="text-sm font-semibold">
                                    {note.createdBy || 'Sistema'}
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {note.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))
                    ) : (
                      <p className="text-center text-muted-foreground pt-10">Nenhuma anotação.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita (Sidebar) */}
        <div className="hidden lg:flex lg:flex-col lg:space-y-6">
          <Card>
              <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsEditClientDialogOpen(true)}><Pencil className="h-4 w-4 mr-2"/>Editar Cliente</Button>
                  <Button variant="outline" className="w-full justify-start" asChild><a href={`mailto:${client.email}`}><Mail className="h-4 w-4 mr-2"/>Enviar E-mail</a></Button>
                  <Button variant="outline" className="w-full justify-start" asChild><a href={`https://wa.me/55${client.telefone?.replace(/\D/g, '')}`} target="_blank"><MessageCircle className="h-4 w-4 mr-2"/>Enviar WhatsApp</a></Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsTransferDialogOpen(true)}><Users className="h-4 w-4 mr-2"/>Transferir Lead</Button>
                  <Button variant="outline" type="button" onClick={handleOpenRiaModal} className="w-full justify-start" disabled={isRiaLoading}>
                    <Sparkles className="h-4 w-4 mr-2 text-primary-custom"/>
                    {isRiaLoading ? "Analisando..." : "Sugestão da RIA"}
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsScheduleVisitOpen(true)}><Calendar className="h-4 w-4 mr-2"/>Agendar Visita</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => setIsFunnelDialogOpen(true)}><ArrowUpDown className="h-4 w-4 mr-2"/>Alterar Etapa do Funil</Button>
              </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span>Status Atual</span><Badge {...getStatusProps(client.overallStatus)}>{client.overallStatus ?? 'N/A'}</Badge></div>
              <div className="flex justify-between"><span>Corretor</span><span className="font-medium">{client.corretor?.nome ?? 'N/A'}</span></div>
              <Separator/>
              <div className="flex justify-between"><span>Anotações</span><span className="font-bold">{client.notas?.length ?? 0}</span></div>
              <div className="flex justify-between"><span>Tarefas Pendentes</span><span className="font-bold">{client.tarefas?.filter(t => !t.concluida).length ?? 0}</span></div>
              <Separator/>
              <div className="flex justify-between"><span>Cliente desde</span><span className="font-medium">{format(new Date(client.createdAt), "dd/MM/yyyy")}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modais */}
      <Dialog open={isWonDialogOpen} onOpenChange={setIsWonDialogOpen}><DialogContent><DialogHeader><DialogTitle>Marcar Cliente como Ganho</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Label htmlFor="sale_value">Valor da Venda</Label><Input id="sale_value" type="number" value={wonDetails.sale_value} onChange={e => setWonDetails({...wonDetails, sale_value: e.target.value})} /><Label htmlFor="sale_date">Data da Venda</Label><Input id="sale_date" type="date" value={wonDetails.sale_date} onChange={e => setWonDetails({...wonDetails, sale_date: e.target.value})} /></div><DialogFooter><Button variant="outline" onClick={() => setIsWonDialogOpen(false)}>Cancelar</Button><Button onClick={handleMarkAsWon}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isLostDialogOpen} onOpenChange={setIsLostDialogOpen}><DialogContent><DialogHeader><DialogTitle>Marcar Cliente como Perdido</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="lost_reason">Motivo da Perda (Obrigatório)</Label>
            <Select value={lostDetails.reason} onValueChange={reason => setLostDetails({...lostDetails, reason})}><SelectTrigger id="lost_reason"><SelectValue placeholder="Selecione um motivo..." /></SelectTrigger><SelectContent>{lostReasons.map(r => <SelectItem key={r.id} value={r.reason}>{r.reason}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label htmlFor="lost_feedback">Feedback (Obrigatório)</Label>
            <Textarea id="lost_feedback" placeholder="Descreva em detalhes o porquê da perda..." value={lostDetails.feedback} onChange={e => setLostDetails({...lostDetails, feedback: e.target.value})} />
          </div>
        </div><DialogFooter><Button variant="outline" onClick={() => setIsLostDialogOpen(false)}>Cancelar</Button><Button onClick={handleMarkAsLost} variant="destructive" disabled={!lostDetails.reason || !lostDetails.feedback}>Confirmar Perda</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isFunnelDialogOpen} onOpenChange={setIsFunnelDialogOpen}><DialogContent><DialogHeader><DialogTitle>Alterar Etapa do Funil</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="funnel_status">Nova Etapa</Label><Select value={newFunnelStatus} onValueChange={setNewFunnelStatus}><SelectTrigger><SelectValue placeholder="Selecione uma etapa..." /></SelectTrigger><SelectContent>{funnelStages.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsFunnelDialogOpen(false)}>Cancelar</Button><Button onClick={handleChangeFunnelStatus}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nova Anotação</DialogTitle></DialogHeader><form onSubmit={handleAddNoteFromForm} className="py-4"><Textarea placeholder="Escreva sua anotação aqui..." value={newNote} onChange={e => setNewNote(e.target.value)} /><DialogFooter className="pt-4"><Button variant="outline" type="button" onClick={() => setIsNoteDialogOpen(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
        <form onSubmit={handleAddTask} className="space-y-4 py-4">
          <Label>Título</Label>
          <Input value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
          <Label>Descrição</Label>
          <Textarea value={taskForm.description || ''} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
          <Label>Data e Hora</Label>
          <Input type="datetime-local" value={taskForm.dataHora} onChange={e => setTaskForm({...taskForm, dataHora: e.target.value})} required />
          <DialogFooter className="pt-4"><Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button><Button type="submit">Criar Tarefa</Button></DialogFooter>
        </form>
      </DialogContent></Dialog>
      <Dialog open={isEditClientDialogOpen} onOpenChange={setIsEditClientDialogOpen}><DialogContent><DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Label>Nome Completo</Label><Input value={editClientForm.nomeCompleto} onChange={e => setEditClientForm({...editClientForm, nomeCompleto: e.target.value})} /><Label>Email</Label><Input type="email" value={editClientForm.email} onChange={e => setEditClientForm({...editClientForm, email: e.target.value})} /><Label>Telefone</Label><Input value={editClientForm.telefone} onChange={e => setEditClientForm({...editClientForm, telefone: e.target.value})} /></div><DialogFooter><Button variant="outline" onClick={() => setIsEditClientDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditClientSubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isEditPropertyDialogOpen} onOpenChange={setIsEditPropertyDialogOpen}><DialogContent><DialogHeader><DialogTitle>{client.imovelDeInteresse ? 'Editar' : 'Inserir'} Imóvel de Interesse</DialogTitle></DialogHeader><div className="py-4"><Label>Selecione o novo imóvel</Label><Select value={newPropertyId} onValueChange={setNewPropertyId}><SelectTrigger><SelectValue placeholder="Selecione um imóvel..." /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsEditPropertyDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditPropertySubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isScheduleVisitOpen} onOpenChange={setIsScheduleVisitOpen}><DialogContent><DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader><div className="py-4"><Label>Data e Hora da Visita</Label><Input type="datetime-local" value={visitDateTime} onChange={e => setVisitDateTime(e.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setIsScheduleVisitOpen(false)}>Cancelar</Button><Button onClick={handleScheduleVisit}>Gerar Link</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}><DialogContent><DialogHeader><DialogTitle>Transferir Lead</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="transfer_user">Transferir para:</Label><Select value={transferToUserId} onValueChange={setTransferToUserId}><SelectTrigger><SelectValue placeholder="Selecione um corretor..." /></SelectTrigger><SelectContent>{users.filter(u => u.id !== client.corretorId).map(u => <SelectItem key={u.id} value={u.id}>{u.nome} ({u.role})</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancelar</Button><Button onClick={handleTransferLead} disabled={!transferToUserId}>Transferir</Button></DialogFooter></DialogContent></Dialog>
      
      <Dialog open={isRiaDialogOpen} onOpenChange={handleRiaDialogClose}>
        <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary-custom" />
              Análise e Sugestões da RIA
            </DialogTitle>
          </DialogHeader>
          {messages.length === 0 && !isRiaLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-lg mb-4">Olá, vai ser um prazer te ajudar.</p>
              <Button onClick={handleFetchRiaSuggestions} disabled={isRiaLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                {isRiaLoading ? "Analisando..." : "Avaliar Cliente"}
              </Button>
            </div>
          )}
          {(isRiaLoading || riaSuggestion) && (
            <div className="overflow-y-auto flex-grow p-1 pr-4">
              {isRiaLoading && !riaSuggestion ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-custom" />
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    // Garante que o container principal tenha a estilização base
                    wrapper: ({ children }) => <div className="prose prose-sm max-w-none">{children}</div>,
                    // Força a quebra de linha em parágrafos
                    p: (props) => <p {...props} className="break-words" />,
                    // Força a quebra de linha em blocos de código
                    pre: (props) => <pre {...props} className="whitespace-pre-wrap bg-slate-100 p-2 rounded-md" />,
                  }}
                >
                  {riaSuggestion}
                </ReactMarkdown>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleRiaDialogClose}>Fechar</Button>
            {riaSuggestion && !isRiaLoading && (
              <Button onClick={handleSaveRiaSuggestionAsNote} disabled={isRiaLoading || !riaSuggestion}>
                <Save className="h-4 w-4 mr-2" /> Salvar como Anotação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
