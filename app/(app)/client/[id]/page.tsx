// app/(app)/client/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { Phone, Mail, Edit, UserPlus, DollarSign } from "lucide-react";
import { format } from 'date-fns';
import { type Cliente, type User, type Nota, type Tarefa, type Imovel } from "@/lib/types";

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [client, setClient] = useState<Cliente | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  const [editClientData, setEditClientData] = useState({
    fullName: "", email: "", phone: "", budget: "", preferences: "", status: ""
  });
  const [assignData, setAssignData] = useState({ assigned_to: "" });
  const [newNote, setNewNote] = useState("");

  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;

  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(response.status === 404 ? "Cliente não encontrado" : "Erro ao carregar dados do cliente");
      
      const data = await response.json();
      setClient(data.client);
      
      setEditClientData({
        fullName: data.client.nomeCompleto || "",
        email: data.client.email || "",
        phone: data.client.telefone || "",
        budget: data.client.budget?.toString() || "",
        preferences: data.client.preferences || "",
        status: data.client.currentFunnelStage || "",
      });
      setAssignData({ assigned_to: data.client.corretorId || "" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);
  
  const fetchUsers = useCallback(async () => {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch("/api/users", { headers: { 'Authorization': `Bearer ${token}` } });
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

  const handleUpdateClient = async (dataToUpdate: object) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToUpdate),
      });
      if (!response.ok) throw new Error(`Falha ao atualizar cliente`);
      await fetchClientData();
      return true;
    } catch (error) {
      console.error(`Error updating client:`, error);
      return false;
    }
  };

  const handleEditClientSubmit = async () => {
    const success = await handleUpdateClient(editClientData);
    if (success) setIsEditClientOpen(false);
  };
  
  const handleAssignClientSubmit = async () => {
    const success = await handleUpdateClient({ assigned_to: assignData.assigned_to });
    if (success) setIsAssignClientOpen(false);
  };

  const handleAddNoteSubmit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/clients/${clientId}/notes`, {
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
  
  if (loading) return <div>Carregando...</div>;
  if (error || !client) return <div>{error || "Cliente não encontrado"}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{client.nomeCompleto}</h1>
        <Button onClick={() => router.push("/pipeline")} variant="outline">Voltar</Button>
      </div>
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações do Cliente</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditClientOpen(true)}><Edit className="h-4 w-4 mr-2" /> Editar</Button>
          </CardHeader>
          <CardContent className="space-y-4">
              <p><Mail className="inline mr-2" /> {client.email || "N/A"}</p>
              <p><Phone className="inline mr-2" /> {client.telefone || "N/A"}</p>
              <p><DollarSign className="inline mr-2" /> {client.budget ? `R$ ${client.budget.toLocaleString("pt-BR")}` : "N/A"}</p>
          </CardContent>
      </Card>
      {/* O resto da UI da página... */}
    </div>
  );
}