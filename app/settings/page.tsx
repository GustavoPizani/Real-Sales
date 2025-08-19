"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Lock, Bell, Plus, Edit, AlertTriangle, Webhook } from "lucide-react"
import { type LostReason } from "@/lib/types"

// REMOVEMOS A PARTE DO MOCK DATA DAQUI

export default function SettingsPage() {
  const { user } = useAuth()
  
  // --- Estados do Componente ---
  const [isLoading, setIsLoading] = useState(true); // Estado para controlar o carregamento
  const [lostReasons, setLostReasons] = useState<LostReason[]>([])
  const [message, setMessage] = useState("")

  // Outros estados do formulário (sem alterações)
  const [notifications, setNotifications] = useState(true)
  const [showAddReason, setShowAddReason] = useState(false)
  const [editingReason, setEditingReason] = useState<LostReason | null>(null)
  const [reasonForm, setReasonForm] = useState("")
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [integrationForm, setIntegrationForm] = useState({ webhook_site_url: "", facebook_api_key: "" })
  
  // --- Efeito para Carregar Dados ---
  useEffect(() => {
    // Função para buscar os motivos de perda da nossa API
    const fetchLostReasons = async () => {
      try {
        const response = await fetch('/api/lost-reasons');
        if (!response.ok) throw new Error('Falha ao buscar dados');
        const data = await response.json();
        setLostReasons(data.reasons || []); // Garante que seja sempre um array
      } catch (error) {
        console.error("Erro ao carregar motivos de perda:", error);
        setMessage("Não foi possível carregar os motivos de perda.");
      } finally {
        setIsLoading(false); // Finaliza o carregamento
      }
    };

    if (user?.role === "marketing_adm") {
      fetchLostReasons();
      // A função loadIntegrations pode ser mantida como está
      // loadIntegrations(); 
    } else {
        setIsLoading(false); // Se não for admin, não precisa carregar
    }
  }, [user]);

  // --- Handlers (Lógica de interação) ---
  // Seus handlers como handleProfileUpdate, handlePasswordUpdate, etc.
  // podem ser mantidos aqui sem alterações.
  // ... (Cole aqui todos os seus handlers: handleProfileUpdate, handlePasswordUpdate, etc.)
  
  // --- Renderização do Componente ---
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ... (Seu JSX para o título e o Alerta de mensagem pode ser mantido) ... */}
      
      {/* ... (Seu JSX para Perfil, Senha e Notificações pode ser mantido) ... */}

      {/* Motivos de Perda de Cliente - Apenas para Admin */}
      {user?.role === "marketing_adm" && (
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2 text-primary-custom">
               <AlertTriangle className="h-5 w-5" />
               Motivos de Perda de Cliente
             </CardTitle>
             <CardDescription>Gerencie os motivos disponíveis para marcar clientes como perdidos</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ... (Seu JSX para o botão "Novo Motivo" e o Dialog pode ser mantido) ... */}
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Carregando motivos...</TableCell>
                    </TableRow>
                  ) : (
                    // CÓDIGO CORRIGIDO E SEGURO:
                    // Usamos '?' para garantir que o map não quebre se lostReasons for nulo.
                    lostReasons?.map((reason) => (
                      <TableRow key={reason.id}>
                        <TableCell className="font-medium">{reason.reason}</TableCell>
                        <TableCell>
                          <Switch checked={reason.active} /* onCheckedChange={() => handleToggleReason(reason)} */ />
                        </TableCell>
                        <TableCell>{new Date(reason.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          {/* ... (Seu JSX para os botões de ação) ... */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ... (Seu JSX para as outras seções pode ser mantido) ... */}
    </div>
  )
}
