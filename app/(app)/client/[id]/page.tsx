"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Mail, Calendar, Clock, User, MessageCircle, Plus, CheckCircle, XCircle, Pencil, Loader2, AlertTriangle, Users, Sparkles, Bot, Save, FileText, Download, UploadCloud, Tag as TagIcon, Trash2, Phone, MoreHorizontal, Building2
} from "lucide-react";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import { format, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type Client as Cliente, type Property as Imovel, ClientOverallStatus, type Note as Nota, type Task as Tarefa, type User as Usuario, type ClientDocument as DocumentoCliente, type Tag } from "@/lib/types";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cachedFetch, invalidateCache } from '@/lib/api-cache';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { TaskReminderFields } from "@/components/tasks/task-reminder-fields";
import { useAuth } from "@/contexts/auth-context";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WhatsappCard } from "@/components/client/whatsapp-card";
import { SalesCard, VendaDialog, type Venda } from "@/components/client/sales-card";

// --- Tipos e Constantes ---

type RiaModalState = 'initial' | 'loading' | 'suggestion' | 'closed';

const TAG_COLORS = [
    '#4B5563', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "N/A";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

// --- Componente Principal ---

function ClientDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Conteúdo principal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        {/* Barra lateral */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailsPage() {
  const params = useParams();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!clientId) {
    return <ClientDetailsSkeleton />;
  }

  return <ClientDetailsContent clientId={clientId} />;
}

// --- Componente de Conteúdo ---

function ClientDetailsContent({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  // RIA e documentos são exclusivos do administrador (corretores parceiros só recebem leads).
  const { user: authUser } = useAuth();
  const isAdmin = !!authUser?.isSuperAdmin;

  // --- Estados ---
  const [client, setClient] = useState<Cliente | null>(null);
  const [properties, setProperties] = useState<Imovel[]>([]);
  const [funnels, setFunnels] = useState<any[]>([]); // Alterado de funnelStages para funnels
  const [users, setUsers] = useState<Usuario[]>([]);
  const [lostReasons, setLostReasons] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ --- ESTADOS PARA DOCUMENTAÇÃO ---
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ------------------------------------------

  // ✅ --- ESTADOS PARA ETIQUETAS (TAGS) ---
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagPopoverView, setTagPopoverView] = useState('list'); // 'list', 'create', or 'edit'
  const [newTagData, setNewTagData] = useState({ name: '', color: TAG_COLORS[12] });
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  // ------------------------------------------

  // Estados dos Modais
  const [isWonDialogOpen, setIsWonDialogOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [isFunnelDialogOpen, setIsFunnelDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [isEditPropertyDialogOpen, setIsEditPropertyDialogOpen] = useState(false);
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  // ── Modal de conclusão de tarefa ──
  const [isCompleteTaskDialogOpen, setIsCompleteTaskDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Tarefa | null>(null);
  const [completionComment, setCompletionComment] = useState("");
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  // ✅ --- ESTADOS PARA EDIÇÃO DE NOTAS ---
  const [editingNote, setEditingNote] = useState<Nota | null>(null);
  const [isEditNoteDialogOpen, setIsEditNoteDialogOpen] = useState(false);

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
  const [lostDetails, setLostDetails] = useState({ reason: "", feedback: "" });
  const [newFunnelStageId, setNewFunnelStageId] = useState(""); // Alterado de newFunnelStatus para newFunnelStageId
  const [newNote, setNewNote] = useState("");
  const [taskForm, setTaskForm] = useState<{ title: string; description: string; dateTime: string; reminderMinutesBefore: number | null; overdueRepeatMinutes: number | null }>({ title: "", description: "", dateTime: "", reminderMinutesBefore: null, overdueRepeatMinutes: null });
  const [editClientForm, setEditClientForm] = useState({ fullName: "", email: "", phone: "" });
  const [newPropertyId, setNewPropertyId] = useState("");
  const [transferToUserId, setTransferToUserId] = useState("");
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("09:00");
  const [activeTab, setActiveTab] = useState("anotacoes");

  // --- WhatsApp — Iniciar Conversa ---
  const [isWhatsAppStartOpen, setIsWhatsAppStartOpen] = useState(false);
  const [waAgents, setWaAgents] = useState<{ id: string; name: string; initiationStrategy: string }[]>([]);
  const [waAgentId, setWaAgentId] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [isSendingWa, setIsSendingWa] = useState(false);

  const openWhatsAppModal = async () => {
    setIsWhatsAppStartOpen(true);
    if (waAgents.length === 0) {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const data = await res.json();
        setWaAgents(data);
        if (data.length > 0) {
          const def = data.find((a: any) => a.isDefault) ?? data[0];
          setWaAgentId(def.id);
          setWaMessage(def.initiationStrategy ?? "");
        }
      }
    }
  };

  const handleSendWhatsApp = async () => {
    if (!waMessage.trim()) return;
    setIsSendingWa(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: waAgentId || undefined, message: waMessage }),
      });
      if (res.ok) {
        toast({ title: "Mensagem enviada!", description: "Primeira mensagem enviada via WhatsApp." });
        setIsWhatsAppStartOpen(false);
      } else {
        const err = await res.json();
        toast({ variant: "destructive", title: "Erro", description: err.error ?? "Falha ao enviar" });
      }
    } finally {
      setIsSendingWa(false);
    }
  };

  // --- Funções de Busca e Atualização de Dados ---
  const refreshClient = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Erro ao buscar cliente");
      const data = await res.json();
      setClient(data.client);
      if (data.client) {
        setNewFunnelStageId(data.client.funnelStageId);
        setEditClientForm({
          fullName: data.client.fullName,
          email: data.client.email || "",
          phone: data.client.phone || ""
        });
        setNewPropertyId(data.client.propertyOfInterestId || "");
      }
    } catch { /* silent — UI already has data */ }
  }, [clientId]);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [clientRes, funnelsRes, reasonsRes, propertiesRes, usersRes, tagsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        cachedFetch('/api/funnels'),
        cachedFetch('/api/lost-reasons'),
        cachedFetch('/api/properties'),
        cachedFetch('/api/users'),
        cachedFetch('/api/tags'),
      ]);

      if (!clientRes.ok) throw new Error("Cliente não encontrado ou erro na API");

      const clientData = await clientRes.json();
      const funnelsData = await funnelsRes.json();
      const reasonsData = await reasonsRes.json();
      const propertiesData = await propertiesRes.json();
      const usersData = await usersRes.json();
      const tagsData = await tagsRes.json();

      setClient(clientData.client);
      setUsers(usersData.users || []);
      setFunnels(Array.isArray(funnelsData) ? funnelsData : funnelsData.funnels ?? []);
      setLostReasons(reasonsData.reasons || []);
      setProperties(propertiesData || []);
      setAllTags(tagsData.tags || []);

      if (clientData.client) {
        setNewFunnelStageId(clientData.client.funnelStageId);
        setEditClientForm({
          fullName: clientData.client.fullName,
          email: clientData.client.email || "",
          phone: clientData.client.phone || ""
        });
        setNewPropertyId(clientData.client.propertyOfInterestId || "");
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

  const handleUpdateClient = async (payload: object, options?: { successMessage?: string; skipRefresh?: boolean }) => {
    const previousClient = client;
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
      if (!options?.skipRefresh) refreshClient();
      return true;
    } catch (error: any) {
      if (previousClient) setClient(previousClient);
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return false;
    }
  };

  const handleToggleTag = async (tagId: string) => {
    if (!client) return;

    const currentTagIds = client.tags?.map(t => t.id) || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter(id => id !== tagId)
      : [...currentTagIds, tagId];

    // Otimisticamente atualiza a UI
    const updatedTags = allTags.filter(tag => newTagIds.includes(tag.id));
    setClient(prev => prev ? { ...prev, tags: updatedTags } : null);

    // Envia a atualização para a API
    await handleUpdateClient(
      { tagIds: newTagIds },
      { successMessage: "Etiquetas atualizadas." }
    );
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagData.name || !newTagData.color) {
        toast({ variant: "destructive", title: "Erro", description: "O name e a cor da etiqueta são obrigatórios." });
        return;
    }
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: newTagData.name, color: newTagData.color }),
        });
        if (!response.ok) throw new Error('Falha ao criar etiqueta.');

        const createdTag = await response.json();
        toast({ title: "Sucesso!", description: `Etiqueta "${newTagData.name}" criada.` });
        
        await fetchData(); // Garante que allTags está atualizado
        await handleToggleTag(createdTag.id); // Aplica a nova tag ao cliente

        setNewTagData({ name: '', color: TAG_COLORS[12] });
        setTagPopoverView('list');
    } catch (error: any) {
        toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setNewTagData({ name: tag.name, color: tag.color });
    setTagPopoverView('edit');
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !newTagData.name || !newTagData.color) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newTagData.name, color: newTagData.color }),
      });

      if (!response.ok) throw new Error('Falha ao atualizar etiqueta.');

      toast({ title: "Sucesso!", description: "Etiqueta atualizada." });
      await fetchData(); // Re-busca para garantir consistência
      setTagPopoverView('list');
      setEditingTag(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;
    if (!window.confirm(`Tem certeza que deseja excluir a etiqueta "${editingTag.name}"? Ela será removida de todos os clientes.`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Falha ao excluir etiqueta.');

      toast({ title: "Sucesso!", description: "Etiqueta excluída." });
      await fetchData();
      setTagPopoverView('list');
      setEditingTag(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  // ✅ --- FUNÇÕES PARA GERENCIAR DOCUMENTOS ---

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast({ title: "Iniciando upload...", description: `Enviando ${files.length} arquivo(s).` });

    try {
      const token = localStorage.getItem('authToken');
      const uploadPromises = Array.from(files).map(file => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`/api/clients/${clientId}/documents/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      });

      const results = await Promise.all(uploadPromises);

      const failedUploads = results.filter(res => !res.ok);
      if (failedUploads.length > 0) {
        throw new Error(`${failedUploads.length} arquivo(s) não puderam ser enviados.`);
      }

      toast({ title: "Sucesso!", description: "Todos os documentos foram enviados." });
      refreshClient();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no Upload", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAllAsZip = async () => {
    if (!client?.documents || client.documents.length === 0) return;
    setIsDownloading(true);
    toast({ title: "Preparando download...", description: "Baixando e compactando arquivos." });

    try {
      const zip = new JSZip();

      const filePromises = client.documents.map(async (doc) => {
        const response = await fetch(doc.url);
        if (!response.ok) throw new Error(`Falha ao baixar ${doc.name}`);
        const blob = await response.blob();
        zip.file(doc.name, blob);
      });

      await Promise.all(filePromises);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `documentos_${client.fullName.replace(/\s/g, '_')}.zip`);

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no Download", description: error.message });
    } finally {
      setIsDownloading(false);
    }
  };
  // --- Handlers de Ações ---

  const handleEditClientSubmit = async () => {
    const success = await handleUpdateClient(editClientForm, { successMessage: "Dados do cliente atualizados." });
    if (success) setIsEditClientDialogOpen(false);
  };

  const handleEditPropertySubmit = async () => {
    const success = await handleUpdateClient({ propertyOfInterestId: newPropertyId }, { successMessage: "Imóvel de interesse atualizado." });
    if (success) setIsEditPropertyDialogOpen(false);
  };

  const handleTransferLead = async () => {
    if (!transferToUserId) return;
    const success = await handleUpdateClient({ brokerId: transferToUserId }, { successMessage: "Lead transferido com sucesso." });
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
        clientName: client.fullName,
        notes: client.notes,
        tasks: client.tasks,
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
    if (!visitDate || !visitTime || !client?.email) {
      toast({ variant: "destructive", title: "Erro", description: "Data, hora e email do cliente são necessários." });
      return;
    }
    const [hours, minutes] = visitTime.split(':').map(Number);
    const startDate = new Date(visitDate);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addHours(startDate, 1);
    const formatCalDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = client.propertyOfInterest
      ? `Visita ao empreendimento ${client.propertyOfInterest.title}`
      : `Visita com ${client.fullName}`;
    const location = client.propertyOfInterest?.address || '';
    const details = [
      `Visita agendada com o cliente ${client.fullName}.`,
      client.propertyOfInterest ? `Imóvel: ${client.propertyOfInterest.title}` : '',
      `\nContacto do cliente:\n📧 ${client.email}`,
      client.phone ? `📞 ${client.phone}` : '',
    ].filter(Boolean).join('\n');
    const params = [
      "https://www.google.com/calendar/render?action=TEMPLATE",
      `text=${encodeURIComponent(title)}`,
      `dates=${formatCalDate(startDate)}/${formatCalDate(endDate)}`,
      `details=${encodeURIComponent(details)}`,
      location ? `location=${encodeURIComponent(location)}` : '',
      `add=${encodeURIComponent(client.email)}`,
      "crm=4",
    ].filter(Boolean).join("&");
    window.open(params, "_blank");
    setIsScheduleVisitOpen(false);
    setVisitDate(undefined);
    setVisitTime("09:00");
  };

  const handleMarkAsLost = async () => {
    if (!lostDetails.reason || !lostDetails.feedback) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Por favor, selecione um motivo e forneça um feedback." });
      return;
    }
    const noteContent = `Cliente marcado como perdido.\nMotivo: ${lostDetails.reason}\nFeedback: ${lostDetails.feedback}`;

    // Primeiro, atualiza o status do cliente
    const updateSuccess = await handleUpdateClient({ overallStatus: ClientOverallStatus.LOST, currentFunnelStage: "Perdido" }, { successMessage: "Cliente marcado como 'Perdido'." });

    // Se o status foi atualizado, adiciona a anotação com os detalhes
    if (updateSuccess) {
      await handleAddNote(noteContent); // Adiciona a anotação
      setIsLostDialogOpen(false); // Fecha o modal
    }
  };

  const handleChangeFunnelStatus = async () => {
    const success = await handleUpdateClient({ funnelStageId: newFunnelStageId }, { successMessage: "Etapa do funil alterada." });
    if (success) { setIsFunnelDialogOpen(false); }
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
      refreshClient();
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

  const openEditNoteDialog = (note: Nota) => {
    setEditingNote(note);
    setIsEditNoteDialogOpen(true);
  };

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editingNote.content) {
      toast({ variant: "destructive", title: "Erro", description: "O conteúdo não pode estar vazio." });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: editingNote.content }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar a anotação.");

      toast({ title: "Sucesso!", description: "Anotação atualizada." });
      setIsEditNoteDialogOpen(false);
      setEditingNote(null);
      refreshClient();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;
    if (!window.confirm("Tem certeza que deseja excluir esta anotação?")) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Falha ao excluir a anotação.");

      toast({ title: "Sucesso!", description: "Anotação excluída." });
      setIsEditNoteDialogOpen(false);
      setEditingNote(null);
      refreshClient();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.dateTime) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione a data e hora da tarefa." });
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          dateTime: new Date(taskForm.dateTime),
          clientId: clientId,
          reminderMinutesBefore: taskForm.reminderMinutesBefore,
          overdueRepeatMinutes: taskForm.overdueRepeatMinutes,
        }),
      });
      if (!response.ok) throw new Error("Falha ao criar tarefa.");
      toast({ title: "Sucesso!", description: "Tarefa criada." });
      setIsTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", dateTime: "", reminderMinutesBefore: null, overdueRepeatMinutes: null });
      refreshClient();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleCompleteTask = async () => {
    if (!taskToComplete) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/tasks/${taskToComplete.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (!res.ok) throw new Error('Falha ao concluir tarefa.');

      if (clientId) {
        const noteContent = `Tarefa Concluída: "${taskToComplete.title}".\n\nComentário: ${completionComment || "Nenhum comentário adicionado."}`;
        await fetch(`/api/clients/${clientId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ content: noteContent }),
        });
      }

      toast({ title: "Sucesso!", description: "Tarefa concluída e anotação criada." });
      setIsCompleteTaskDialogOpen(false);
      setTaskToComplete(null);
      setCompletionComment("");
      refreshClient();
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
    if (status === ClientOverallStatus.WON) return { className: "bg-emerald-100 text-emerald-800" };
    if (status === ClientOverallStatus.LOST) return { className: "bg-red-100 text-red-800" };
    const stage = stagesForCurrentFunnel.find(s => s.name === status);
    if (stage?.color) return { style: { color: stage.color, backgroundColor: `${stage.color}1A` } };
    return { className: "bg-gray-100 text-gray-800" };
  };

  // --- Funções de Lógica de UI ---
  const stagesForCurrentFunnel = useMemo(() => {
    if (!client || !client.funnelId || !funnels) return [];
    const currentFunnel = funnels.find(f => f.id === client.funnelId);
    return currentFunnel?.stages || [];
  }, [client, funnels]);

  // --- Renderização ---

  if (loading) {
    return <ClientDetailsSkeleton />;
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

  const rawPhone = client.phone?.replace(/\D/g, '') ?? '';
  const waPhone = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone : `55${rawPhone}`;

  const vendas = ((client as any).sales ?? []) as Venda[];
  const totalVendido = vendas.reduce((s, v) => s + v.saleValue, 0);
  const tarefasPendentes = (client.tasks ?? []).filter(t => !t.isCompleted).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const proximaTarefa = tarefasPendentes[0];
  const iniciaisCliente = client.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const corEtapa = stagesForCurrentFunnel.find(s => s.id === client.funnelStageId)?.color;
  const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const STATUS_CLIENTE = {
    [ClientOverallStatus.WON]: { rotulo: "Ganho", icone: CheckCircle, classe: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
    [ClientOverallStatus.LOST]: { rotulo: "Perdido", icone: XCircle, classe: "bg-red-500/15 text-red-700 dark:text-red-300" },
  } as Record<string, { rotulo: string; icone: typeof CheckCircle; classe: string }>;
  const statusCliente = STATUS_CLIENTE[client.overallStatus] ?? { rotulo: "Em atendimento", icone: Clock, classe: "bg-muted text-foreground" };
  const IconeStatus = statusCliente.icone;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
      {/* Cabeçalho: quem é, em que pé está e as ações principais */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3 h-9 text-muted-foreground" onClick={() => router.push("/pipeline")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Pipeline
        </Button>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-[var(--accent-primary)]"
              style={{ background: "color-mix(in srgb, var(--accent-primary) 16%, transparent)" }}
              aria-hidden
            >
              {iniciaisCliente || <User className="h-6 w-6" />}
            </span>
            <div className="min-w-0 space-y-2">
              <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{client.fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCliente.classe}`}>
                  <IconeStatus className="h-3.5 w-3.5" aria-hidden /> {statusCliente.rotulo}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: corEtapa || "currentColor" }} aria-hidden />
                  {client.funnel?.name} › {client.funnelStage?.name}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden /> {client.broker?.name ?? "Sem corretor"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 text-foreground underline-offset-4 hover:underline">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /> {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="inline-flex min-w-0 items-center gap-1.5 break-all text-foreground underline-offset-4 hover:underline">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> {client.email}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden /> Cliente desde {format(new Date(client.createdAt), "dd/MM/yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            <Button asChild className="h-11 flex-1 sm:flex-none">
              <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</a>
            </Button>
            <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setIsScheduleVisitOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" /> Agendar visita
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 w-11 p-0" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setIsEditClientDialogOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Editar cliente</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsTransferDialogOpen(true)}><Users className="mr-2 h-4 w-4" /> Transferir lead</DropdownMenuItem>
                {client.email && (
                  <DropdownMenuItem asChild><a href={`mailto:${client.email}`}><Mail className="mr-2 h-4 w-4" /> Enviar e-mail</a></DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleOpenRiaModal} disabled={isRiaLoading}><Bot className="mr-2 h-4 w-4" /> Sugestão da RIA</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsDocumentsModalOpen(true)}><FileText className="mr-2 h-4 w-4" /> Documentação</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {client.overallStatus === ClientOverallStatus.ACTIVE && (
              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="outline" className="h-11 flex-1 border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300" onClick={() => setIsWonDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Ganho
                </Button>
                <Button variant="outline" className="h-11 flex-1 border-red-600/40 text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300" onClick={() => setIsLostDialogOpen(true)}>
                  <XCircle className="mr-2 h-4 w-4" /> Perdido
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Etapas do funil: clicar muda a etapa */}
        {stagesForCurrentFunnel.length > 0 && client.overallStatus === ClientOverallStatus.ACTIVE && (
          <nav aria-label="Etapas do funil" className="mt-5 -mx-1 overflow-x-auto px-1 pb-1">
            <ol className="flex min-w-max gap-1.5">
              {stagesForCurrentFunnel.map((stage, idx) => {
                const atual = stagesForCurrentFunnel.findIndex(s => s.id === client.funnelStageId);
                const ativa = idx === atual;
                const passada = idx < atual;
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      aria-current={ativa ? "step" : undefined}
                      onClick={() => {
                        if (ativa) return;
                        setClient(prev => prev ? { ...prev, funnelStageId: stage.id, funnelStage: { ...prev.funnelStage, id: stage.id, name: stage.name } } : null);
                        handleUpdateClient({ funnelStageId: stage.id }, { successMessage: `Movido para "${stage.name}".`, skipRefresh: true });
                      }}
                      className={[
                        "flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]",
                        ativa
                          ? "bg-[#171C26] text-white dark:bg-[var(--accent-primary)] dark:text-[#171C26]"
                          : passada
                            ? "bg-muted text-foreground hover:bg-muted/70"
                            : "border border-dashed text-muted-foreground hover:bg-muted/60",
                      ].join(" ")}
                    >
                      {passada && <CheckCircle className="h-3.5 w-3.5" aria-hidden />}
                      {stage.name}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </section>

      {/* Números do cliente */}
      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Vendido</p>
          <p className="mt-1 text-lg font-bold">{vendas.length ? reais(totalVendido) : "—"}</p>
          <p className="text-xs text-muted-foreground">{vendas.length ? `${vendas.length} ${vendas.length === 1 ? "imóvel" : "imóveis"}` : "Nenhuma venda"}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Próxima tarefa</p>
          <p className="mt-1 truncate text-sm font-semibold">{proximaTarefa?.title ?? "—"}</p>
          <p className={`text-xs ${proximaTarefa && new Date(proximaTarefa.dateTime) < new Date() ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
            {proximaTarefa ? `${new Date(proximaTarefa.dateTime) < new Date() ? "Atrasada · " : ""}${format(new Date(proximaTarefa.dateTime), "dd/MM HH:mm")}` : `${tarefasPendentes.length} pendentes`}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Imóvel de interesse</p>
          <p className="mt-1 truncate text-sm font-semibold">{client.propertyOfInterest?.title ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{client.notes?.length ?? 0} anotações</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Origem</p>
          <p className="mt-1 truncate text-sm font-semibold">{(client as any).campaignSource ?? "Orgânico"}</p>
          <p className="truncate text-xs text-muted-foreground">Gerente: {(client.broker as any)?.supervisor?.name ?? "—"}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
        {/* Coluna lateral: no celular vem primeiro (etiquetas e imóvel ficam à mão) */}
        <aside className="space-y-5 lg:order-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><TagIcon className="h-4 w-4" aria-hidden /> Etiquetas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {client.tags?.length ? client.tags.map(tag => (
                  <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden />
                    {tag.name}
                  </span>
                )) : <span className="text-sm text-muted-foreground">Nenhuma etiqueta.</span>}
                <Popover open={isTagPopoverOpen} onOpenChange={(isOpen) => {
                  setIsTagPopoverOpen(isOpen);
                  if (!isOpen) {
                    setTimeout(() => { setTagPopoverView('list'); setEditingTag(null); }, 150);
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 rounded-full" aria-label="Adicionar ou editar etiquetas">
                      <Plus className="mr-1 h-3.5 w-3.5" /> Etiqueta
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    {tagPopoverView === 'list' ? (
                      <div>
                        <div className="p-2 text-center border-b"><span className="text-sm font-semibold">Etiquetas</span></div>
                        <div className="p-2"><Input type="text" placeholder="Buscar etiquetas..." value={tagSearch} onChange={e => setTagSearch(e.target.value)} className="h-8 text-sm" /></div>
                        <Command>
                          <CommandList className="max-h-40">
                            <CommandGroup>
                              {allTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                                <div key={tag.id} className="flex items-center pr-2">
                                  <CommandItem onSelect={() => handleToggleTag(tag.id)} className="flex-grow flex items-center cursor-pointer">
                                    <div className="w-5 h-5 rounded-sm mr-2" style={{ backgroundColor: tag.color }}></div>
                                    <span className="flex-grow text-sm">{tag.name}</span>
                                    {client.tags?.some(t => t.id === tag.id) && <CheckCircle className="h-4 w-4 text-primary" />}
                                  </CommandItem>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditTag(tag)}><Pencil className="h-3 w-3 text-muted-foreground" /></Button>
                                </div>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                        <div className="p-2 border-t">
                          <Button onClick={() => setTagPopoverView('create')} className="w-full h-8 text-sm" variant="ghost">Criar uma nova etiqueta</Button>
                        </div>
                      </div>
                    ) : tagPopoverView === 'create' ? (
                      <div>
                        <div className="flex items-center p-2 text-center border-b relative">
                          <Button onClick={() => setTagPopoverView('list')} className="absolute left-1 h-6 w-6" variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                          <span className="text-sm font-semibold flex-1">Criar Etiqueta</span>
                        </div>
                        <form onSubmit={handleCreateTag} className="p-3 space-y-3">
                          <div>
                            <Label htmlFor="new-tag-name" className="text-sm font-medium text-gray-700">Título</Label>
                            <Input id="new-tag-name" type="text" value={newTagData.name} onChange={e => setNewTagData({ ...newTagData, name: e.target.value })} className="mt-1 w-full h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Selecionar uma cor</Label>
                            <div className="grid grid-cols-6 gap-2 mt-2">
                              {TAG_COLORS.map(color => (
                                <button key={color} type="button" onClick={() => setNewTagData({ ...newTagData, color })} className={`w-full h-7 rounded-md border-2 ${newTagData.color === color ? 'border-primary' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                              ))}
                            </div>
                          </div>
                          <Button type="submit" disabled={!newTagData.name} className="w-full h-9 text-sm">Criar</Button>
                        </form>
                      </div>
                    ) : ( // 'edit' view
                      <div>
                        <div className="flex items-center p-2 text-center border-b relative">
                          <Button onClick={() => setTagPopoverView('list')} className="absolute left-1 h-6 w-6" variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                          <span className="text-sm font-semibold flex-1">Editar Etiqueta</span>
                        </div>
                        <form onSubmit={handleUpdateTag} className="p-3 space-y-3">
                          <div>
                            <Label htmlFor="edit-tag-name" className="text-sm font-medium text-gray-700">Título</Label>
                            <Input id="edit-tag-name" type="text" value={newTagData.name} onChange={e => setNewTagData({ ...newTagData, name: e.target.value })} className="mt-1 w-full h-8 text-sm" />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Selecionar uma cor</Label>
                            <div className="grid grid-cols-6 gap-2 mt-2">
                              {TAG_COLORS.map(color => (
                                <button key={color} type="button" onClick={() => setNewTagData({ ...newTagData, color })} className={`w-full h-7 rounded-md border-2 ${newTagData.color === color ? 'border-primary' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="destructive" size="icon" onClick={handleDeleteTag}><Trash2 className="h-4 w-4" /></Button>
                            <Button type="submit" disabled={!newTagData.name} className="w-full h-9 text-sm">Salvar</Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" aria-hidden /> Imóvel de interesse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.propertyOfInterest ? (
                <>
                  <div>
                    <p className="font-semibold">{client.propertyOfInterest.title}</p>
                    <p className="text-sm text-muted-foreground">{client.propertyOfInterest.address || "Endereço não disponível"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-10 flex-1" onClick={() => router.push(`/properties/${client.propertyOfInterestId}/view`)}>Ver imóvel</Button>
                    <Button variant="outline" size="sm" className="h-10 flex-1" onClick={() => setIsEditPropertyDialogOpen(true)}>Trocar</Button>
                  </div>
                </>
              ) : (
                <Button variant="outline" className="h-10 w-full" onClick={() => setIsEditPropertyDialogOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Escolher imóvel
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Vendas: cada imóvel vendido, com planta e valor (logo abaixo do imóvel de interesse) */}
          {(client.overallStatus === ClientOverallStatus.WON || vendas.length > 0) && (
            <SalesCard clientId={clientId} vendas={vendas} onAlterado={refreshClient} />
          )}

          {/* Card de Observações do Formulário Facebook (apenas campos extras com valor real) */}
          {(() => {
            const STANDARD = new Set([
              'full_name','email','phone_number','phone','whatsapp_number',
              'first_name','last_name','name',
              // Campos de metadados internos do Facebook
              'inbox_url','platform','partner_name','page_id','page_name',
              'form_id','leadgen_id','campaign_id','campaign_name',
              'adgroup_id','adgroup_name','ad_id','ad_name','created_time','is_organic',
            ])
            const entries = client.formResponses
              ? Object.entries(client.formResponses as Record<string, string>).filter(([k, v]) => {
                  const key = k.toLowerCase().replace(/\s+/g, '_')
                  if (STANDARD.has(key)) return false
                  if (!v || String(v).trim() === '') return false
                  // Excluir valores que são URLs do Facebook (metadados internos)
                  if (String(v).startsWith('https://business.facebook.com')) return false
                  return true
                })
              : []
            if (entries.length === 0) return null
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" aria-hidden /> Respostas do formulário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entries.map(([key, value]) => (
                      <div key={key} className="grid grid-cols-2 gap-2 text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

        </aside>

        {/* Coluna principal */}
        <div className="space-y-5 lg:order-1 lg:col-span-2">
          {/* Conversa do WhatsApp guardada pela extensão (só administrador) */}
          {isAdmin && <WhatsappCard clientId={clientId} waPhone={waPhone} tags={client.tags} onRia={handleOpenRiaModal} />}

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
                  <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="anotacoes">Anotações</TabsTrigger><TabsTrigger value="tarefas">Tarefas</TabsTrigger></TabsList>
                </div>
                <TabsContent value="tarefas" className="p-4 sm:p-6 pt-4">
                  <Table>
                    <TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Data/Hora</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {client.tasks?.length > 0 ? client.tasks.map(task => (
                        <TableRow
                          key={task.id}
                          className={task.isCompleted ? "opacity-60" : "cursor-pointer hover:bg-accent/50"}
                          onClick={() => {
                            if (!task.isCompleted) {
                              setTaskToComplete(task);
                              setCompletionComment("");
                              setIsCompleteTaskDialogOpen(true);
                            }
                          }}
                        >
                          <TableCell>{task.title}</TableCell>
                          <TableCell>{format(new Date(task.dateTime), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell><Badge variant={task.isCompleted ? "secondary" : "default"}>{task.isCompleted ? "Concluída" : "Pendente"}</Badge></TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={3} className="text-center">Nenhuma tarefa.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="anotacoes" className="p-4 sm:p-6 pt-4">
                  <div className="space-y-4">
                    {client.notes && client.notes.length > 0 ? (
                      [...(client.notes || [])]
                        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                        .map((note) => (
                          <Card key={note.id} className="shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                                  <User className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className="flex flex-col">
                                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                                    {note.author?.name ? (
                                      note.author.name
                                    ) : note.authorName ? (
                                      <span className="line-through text-muted-foreground" title="Utilizador removido">
                                        {note.authorName}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">Autor desconhecido</span>
                                    )}
                                  </CardTitle>
                                  <p className="text-xs text-muted-foreground">
                                    {note.createdAt ? format(new Date(note.createdAt), "dd/MM/yyyy 'às' HH:mm") : ''}
                                  </p>
                                </div>
                              </div>
                              {/* ✅ --- BOTÃO DE EDITAR NOTA --- ✅ */}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditNoteDialog(note)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
      </div>

      {/* Modais */}
      <VendaDialog
        clientId={clientId}
        aberto={isWonDialogOpen}
        onFechar={() => setIsWonDialogOpen(false)}
        titulo="Cliente ganho: registrar a venda"
        onSalvo={async (total, venda) => {
          await handleUpdateClient(
            { overallStatus: ClientOverallStatus.WON, currentFunnelStage: "Ganho", detalhesDeVenda: { sale_value: total, sale_date: venda.saleDate ?? new Date().toISOString() } },
            { successMessage: "Cliente marcado como 'Ganho'!" },
          );
        }}
      />
      <Dialog open={isLostDialogOpen} onOpenChange={setIsLostDialogOpen}><DialogContent><DialogHeader><DialogTitle>Marcar Cliente como Perdido</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="lost_reason">Motivo da Perda (Obrigatório)</Label>
            <Select value={lostDetails.reason} onValueChange={reason => setLostDetails({ ...lostDetails, reason })}><SelectTrigger id="lost_reason"><SelectValue placeholder="Selecione um motivo..." /></SelectTrigger><SelectContent>{lostReasons.map(r => <SelectItem key={r.id} value={r.reason}>{r.reason}</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label htmlFor="lost_feedback">Feedback (Obrigatório)</Label>
            <Textarea id="lost_feedback" placeholder="Descreva em detalhes o porquê da perda..." value={lostDetails.feedback} onChange={e => setLostDetails({ ...lostDetails, feedback: e.target.value })} />
          </div>
        </div><DialogFooter><Button variant="outline" onClick={() => setIsLostDialogOpen(false)}>Cancelar</Button><Button onClick={handleMarkAsLost} variant="destructive" disabled={!lostDetails.reason || !lostDetails.feedback}>Confirmar Perda</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isFunnelDialogOpen} onOpenChange={setIsFunnelDialogOpen}><DialogContent><DialogHeader><DialogTitle>Alterar Etapa do Funil</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="funnel_status">Nova Etapa</Label><Select value={newFunnelStageId} onValueChange={setNewFunnelStageId}><SelectTrigger><SelectValue placeholder="Selecione uma etapa..." /></SelectTrigger><SelectContent>{stagesForCurrentFunnel.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsFunnelDialogOpen(false)}>Cancelar</Button><Button onClick={handleChangeFunnelStatus}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nova Anotação</DialogTitle></DialogHeader><form onSubmit={handleAddNoteFromForm} className="py-4"><Textarea placeholder="Escreva sua anotação aqui..." value={newNote} onChange={e => setNewNote(e.target.value)} /><DialogFooter className="pt-4"><Button variant="outline" type="button" onClick={() => setIsNoteDialogOpen(false)}>Cancelar</Button><Button type="submit">Adicionar</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}><DialogContent><DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
        <form onSubmit={handleAddTask} className="space-y-4 py-4">
          <Label>Título</Label>
          <Input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
          <Label>Descrição</Label>
          <Textarea value={taskForm.description || ''} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
          <Label>Data e Hora</Label>
          <DateTimePicker value={taskForm.dateTime} onChange={v => setTaskForm({ ...taskForm, dateTime: v })} />
          <TaskReminderFields
            reminderMinutesBefore={taskForm.reminderMinutesBefore}
            onReminderMinutesBeforeChange={v => setTaskForm({ ...taskForm, reminderMinutesBefore: v })}
            overdueRepeatMinutes={taskForm.overdueRepeatMinutes}
            onOverdueRepeatMinutesChange={v => setTaskForm({ ...taskForm, overdueRepeatMinutes: v })}
          />
          <DialogFooter className="pt-4"><Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button><Button type="submit">Criar Tarefa</Button></DialogFooter>
        </form>
      </DialogContent></Dialog>
      <Dialog open={isEditClientDialogOpen} onOpenChange={setIsEditClientDialogOpen}><DialogContent><DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader><div className="space-y-4 py-4"><Label>Nome Completo</Label><Input value={editClientForm.fullName} onChange={e => setEditClientForm({ ...editClientForm, fullName: e.target.value })} /><Label>Email</Label><Input type="email" value={editClientForm.email} onChange={e => setEditClientForm({ ...editClientForm, email: e.target.value })} /><Label>Telefone</Label><Input value={editClientForm.phone} onChange={e => setEditClientForm({ ...editClientForm, phone: e.target.value })} /></div><DialogFooter><Button variant="outline" onClick={() => setIsEditClientDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditClientSubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isEditPropertyDialogOpen} onOpenChange={setIsEditPropertyDialogOpen}><DialogContent><DialogHeader><DialogTitle>{client.propertyOfInterest ? 'Editar' : 'Inserir'} Imóvel de Interesse</DialogTitle></DialogHeader><div className="py-4"><Label>Selecione o novo imóvel</Label><Select value={newPropertyId} onValueChange={setNewPropertyId}><SelectTrigger><SelectValue placeholder="Selecione um imóvel..." /></SelectTrigger><SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsEditPropertyDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditPropertySubmit}>Salvar</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isScheduleVisitOpen} onOpenChange={(open) => { setIsScheduleVisitOpen(open); if (!open) { setVisitDate(undefined); setVisitTime("09:00"); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Visita</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-5">
            <div className="space-y-2">
              <Label>Data da Visita</Label>
              <CalendarPicker
                mode="single"
                selected={visitDate}
                onSelect={setVisitDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                locale={ptBR}
                className="rounded-md border mx-auto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-time">Horário da Visita</Label>
              <div className="relative max-w-[9rem]">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <Input
                  type="time"
                  id="visit-time"
                  min="07:00"
                  max="20:00"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            {visitDate && (
              <p className="text-sm text-muted-foreground">
                Visita agendada para{" "}
                <span className="font-medium text-foreground">
                  {format(visitDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>{" "}
                às <span className="font-medium text-foreground">{visitTime}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleVisitOpen(false)}>Cancelar</Button>
            <Button onClick={handleScheduleVisit} disabled={!visitDate || !visitTime}>
              <Calendar className="h-4 w-4 mr-2" />
              Gerar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}><DialogContent><DialogHeader><DialogTitle>Transferir Lead</DialogTitle></DialogHeader><div className="py-4"><Label htmlFor="transfer_user">Transferir para:</Label><Select value={transferToUserId} onValueChange={setTransferToUserId}><SelectTrigger><SelectValue placeholder="Selecione um BROKER..." /></SelectTrigger><SelectContent>{users.filter(u => u.id !== client.brokerId).map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>Cancelar</Button><Button onClick={handleTransferLead} disabled={!transferToUserId}>Transferir</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={isRiaDialogOpen} onOpenChange={handleRiaDialogClose}>
        <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-secondary-custom" />
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

      {/* ✅ --- MODAL DE DOCUMENTAÇÃO --- ✅ */}
      <Dialog open={isDocumentsModalOpen} onOpenChange={setIsDocumentsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documentação do Cliente</DialogTitle>
            <DialogDescription>Gerencie os arquivos de {client.fullName}.</DialogDescription>
          </DialogHeader>

          {/* Input de arquivo escondido */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleUploadFiles}
            className="hidden"
          />

          {client.documents && client.documents.length > 0 ? (
            <div className="space-y-4 py-4">
              <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
                {client.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border rounded-md">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                      {doc.name}
                    </a>
                    <span className="text-xs text-muted-foreground">{doc.createdAt ? format(new Date(doc.createdAt), 'dd/MM/yy') : ''}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleDownloadAllAsZip} className="flex-1" disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Baixar Todos (.zip)
                </Button>
                <Button onClick={handleFileSelect} variant="secondary" className="flex-1" disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  Subir Novos
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10"><p className="text-muted-foreground mb-4">Nenhum documento encontrado.</p><Button onClick={handleFileSelect} disabled={isUploading}>{isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}Fazer Upload de Documentação</Button></div>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ --- MODAL DE EDIÇÃO DE NOTA --- ✅ */}
      <Dialog open={isEditNoteDialogOpen} onOpenChange={setIsEditNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Anotação</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <form onSubmit={handleUpdateNote} className="py-4">
              <Textarea
                placeholder="Edite sua anotação aqui..."
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                rows={6}
              />
              <DialogFooter className="pt-4 justify-between">
                <Button type="button" variant="destructive" onClick={handleDeleteNote}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
                <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setIsEditNoteDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* ── MODAL DE CONCLUSÃO DE TAREFA ── */}
      <Dialog open={isCompleteTaskDialogOpen} onOpenChange={(open) => {
        setIsCompleteTaskDialogOpen(open);
        if (!open) { setTaskToComplete(null); setCompletionComment(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Tarefa: {taskToComplete?.title}</DialogTitle>
            <DialogDescription>Adicione um comentário de conclusão que será salvo nas anotações do cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="task-comment">Comentário de conclusão</Label>
            <Textarea
              id="task-comment"
              placeholder="Descreva o resultado ou adicione informações relevantes..."
              value={completionComment}
              onChange={(e) => setCompletionComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCompleteTaskDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCompleteTask}>Confirmar Conclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
