// app/(app)/tasks/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock, User, AlertCircle, MoreHorizontal, Trash2, Edit, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  dateTime: string;
  clientId: string;
  client?: { fullName: string };
}

interface Client {
  id: string;
  fullName: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCompleteTaskDialogOpen, setIsCompleteTaskDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [completionComment, setCompletionComment] = useState("");
  const [createForm, setCreateForm] = useState({ title: "", description: "", dateTime: "", clientId: "" });
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/tasks", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTasks(await res.json());
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as tarefas." });
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/clients", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os clientes." });
    }
  };

  useEffect(() => { fetchTasks(); fetchClients(); }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          dateTime: createForm.dateTime,
          clientId: createForm.clientId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao criar tarefa");
      setIsCreateModalOpen(false);
      setCreateForm({ title: "", description: "", dateTime: "", clientId: "" });
      fetchTasks();
      toast({ title: "Sucesso!", description: "Tarefa criada com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          dateTime: editingTask.dateTime,
          clientId: editingTask.clientId,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao atualizar tarefa");
      setIsEditModalOpen(false);
      setEditingTask(null);
      fetchTasks();
      toast({ title: "Sucesso!", description: "Tarefa atualizada com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erro ao excluir tarefa");
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
      fetchTasks();
      toast({ title: "Sucesso!", description: "Tarefa excluída com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleMarkAsComplete = async (task: Task, comment: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (!res.ok) throw new Error("Falha ao marcar a tarefa como concluída.");

      if (task.clientId) {
        const noteContent = `Tarefa Concluída: "${task.title}".\n\nComentário: ${comment || "Nenhum comentário adicionado."}`;
        await fetch(`/api/clients/${task.clientId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: noteContent }),
        });
      }

      toast({ title: "Sucesso!", description: "Tarefa concluída e anotação criada." });
      fetchTasks();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleConfirmCompletion = async () => {
    if (!taskToComplete) return;
    await handleMarkAsComplete(taskToComplete, completionComment);
    setIsCompleteTaskDialogOpen(false);
    setTaskToComplete(null);
    setCompletionComment("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas atividades e compromissos</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Tarefa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Tarefa</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="clientId">Cliente *</Label>
                  <Select value={createForm.clientId} onValueChange={(v) => setCreateForm({ ...createForm, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="dateTime">Data e Hora *</Label>
                <Input id="dateTime" type="datetime-local" value={createForm.dateTime} onChange={(e) => setCreateForm({ ...createForm, dateTime: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Criar Tarefa</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground">Crie sua primeira tarefa para começar.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold line-clamp-2">{task.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!task.isCompleted && (
                        <DropdownMenuItem onSelect={() => { setTaskToComplete(task); setIsCompleteTaskDialogOpen(true); }}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Concluída
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => { setEditingTask(task); setIsEditModalOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { setTaskToDelete(task); setIsDeleteDialogOpen(true); }} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.description && <p className="text-muted-foreground text-sm line-clamp-3">{task.description}</p>}
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="h-4 w-4" /><span>{task.client?.fullName || "Cliente não encontrado"}</span></div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /><span>{new Date(task.dateTime).toLocaleString("pt-BR")}</span></div>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <Badge variant={task.isCompleted ? "default" : "secondary"}>{task.isCompleted ? "Concluída" : "Pendente"}</Badge>
                {new Date(task.dateTime) < new Date() && !task.isCompleted && (
                  <div className="flex items-center gap-1 text-red-500 text-xs"><AlertCircle className="h-3 w-3" /><span>Atrasada</span></div>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Edit */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Tarefa</DialogTitle></DialogHeader>
          {editingTask && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Título *</Label>
                  <Input value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })} required />
                </div>
                <div>
                  <Label>Cliente *</Label>
                  <Select value={editingTask.clientId} onValueChange={(v) => setEditingTask({ ...editingTask, clientId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={editingTask.dateTime.substring(0, 16)} onChange={(e) => setEditingTask({ ...editingTask, dateTime: e.target.value })} required />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editingTask.description ?? ""} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. A tarefa será excluída permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete */}
      <Dialog open={isCompleteTaskDialogOpen} onOpenChange={(open) => {
        setIsCompleteTaskDialogOpen(open);
        if (!open) { setTaskToComplete(null); setCompletionComment(""); }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Concluir Tarefa: {taskToComplete?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="comment">Comentário de conclusão</Label>
            <Textarea id="comment" placeholder="Descreva o resultado ou adicione informações relevantes..." value={completionComment} onChange={(e) => setCompletionComment(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCompleteTaskDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleConfirmCompletion}>Confirmar Conclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
