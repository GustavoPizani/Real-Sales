// app/(app)/settings/page.tsx - VERSÃO SIMPLIFICADA

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { User, Lock, Bell, AlertTriangle, Users as UsersIcon, Plus, Edit } from "lucide-react"
import { type User as UserType, USER_ROLE_LABELS, type LostReason } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns';

// --- Sub-componente: Aba de Perfil ---
function ProfileTab() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name });
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken'); // Pega o token de autenticação
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Envia o token para a API
        },
        body: JSON.stringify({ name: profileForm.name }),
      });

      if (!response.ok) throw new Error('Falha ao atualizar perfil');
      
      const updatedUserData = await response.json();
      setUser(updatedUserData.user);
      toast({ title: "Sucesso!", description: "Seu nome foi atualizado." });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro!", description: "Não foi possível atualizar seu nome." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Perfil do Usuário</CardTitle>
          <CardDescription>Atualize suas informações pessoais.</CardDescription>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} disabled={!isEditing} />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={user?.email || ''} readOnly disabled />
            </div>
          </div>
          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// --- Sub-componente: Aba de Segurança ---
function SecurityTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ variant: "destructive", title: "Erro!", description: "As novas senhas não coincidem." });
      return;
    }
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken'); // Pega o token de autenticação
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Envia o token para a API
        },
        body: JSON.stringify({ 
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar a senha');
      }
      
      toast({ title: "Sucesso!", description: "Sua senha foi alterada." });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro!", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança</CardTitle>
        <CardDescription>Altere sua senha para manter sua conta segura.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Alterando...' : 'Alterar Senha'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Sub-componente: Aba de Notificações ---
function NotificationsTab() {
  const [permission, setPermission] = useState('default');
  const { toast } = useToast();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ variant: "destructive", title: "Erro!", description: "Este navegador não suporta notificações." });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      new Notification("Real Sales CRM", { body: "As notificações foram ativadas!" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Configure suas preferências de notificação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Notificações no navegador</Label>
            <p className="text-sm text-muted-foreground">
              Status atual: <span className="font-semibold">{permission === 'granted' ? 'Permitido' : permission === 'denied' ? 'Negado' : 'Padrão'}</span>
            </p>
          </div>
          <Button onClick={handleRequestPermission} disabled={permission === 'granted'}>
            {permission === 'granted' ? 'Permissão Concedida' : 'Pedir Permissão'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Sub-componente: Aba de Motivos de Perda ---
function LostReasonsTab() {
    const [reasons, setReasons] = useState<LostReason[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingReason, setEditingReason] = useState<LostReason | null>(null);
    const [reasonText, setReasonText] = useState('');
    const { toast } = useToast();

    const fetchReasons = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/lost-reasons');
            const data = await response.json();
            setReasons(data.reasons || []);
        } catch (error) {
            toast({ variant: "destructive", title: "Erro!", description: "Não foi possível carregar os motivos." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReasons();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingReason ? 'PATCH' : 'POST';
        const url = editingReason ? `/api/lost-reasons/${editingReason.id}` : '/api/lost-reasons';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reasonText }),
            });
            if (!response.ok) throw new Error('Falha ao salvar motivo.');
            
            toast({ title: "Sucesso!", description: `Motivo ${editingReason ? 'atualizado' : 'criado'}.` });
            setIsDialogOpen(false);
            setEditingReason(null);
            setReasonText('');
            fetchReasons();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro!", description: "Não foi possível salvar o motivo." });
        }
    };

    const handleToggleStatus = async (reason: LostReason) => {
        try {
            const response = await fetch(`/api/lost-reasons/${reason.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !reason.active }),
            });
            if (!response.ok) throw new Error('Falha ao alterar status.');
            toast({ title: "Sucesso!", description: "Status do motivo foi alterado." });
            fetchReasons();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro!", description: "Não foi possível alterar o status." });
        }
    };
    
    const openDialog = (reason: LostReason | null = null) => {
        setEditingReason(reason);
        setReasonText(reason ? reason.reason : '');
        setIsDialogOpen(true);
    };

    if (loading) return <p>Carregando motivos...</p>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Motivos de Perda de Cliente</CardTitle>
                <CardDescription>Gerencie os motivos que os corretores podem selecionar.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={() => openDialog()}><Plus className="mr-2 h-4 w-4" /> Novo Motivo</Button>
                </div>
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
                        {reasons.map((reason) => (
                            <TableRow key={reason.id}>
                                <TableCell className="font-medium">{reason.reason}</TableCell>
                                <TableCell>
                                    <Switch checked={reason.active} onCheckedChange={() => handleToggleStatus(reason)} />
                                </TableCell>
                                <TableCell>{format(new Date(reason.created_at), 'dd/MM/yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openDialog(reason)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingReason ? 'Editar Motivo' : 'Criar Novo Motivo'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="reason-text">Descrição do Motivo</Label>
                                <Input id="reason-text" value={reasonText} onChange={(e) => setReasonText(e.target.value)} required />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">Salvar</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}


// --- Componente Principal da Página de Configurações ---
export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-custom">Configurações</h1>
        <p className="text-gray-600">Gerencie as suas preferências e configurações da conta.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          {user?.role === 'marketing_adm' && (
            <TabsTrigger value="lost_reasons">Motivos de Perda</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-4"><ProfileTab /></TabsContent>
        <TabsContent value="security" className="mt-4"><SecurityTab /></TabsContent>
        <TabsContent value="notifications" className="mt-4"><NotificationsTab /></TabsContent>
        
        {user?.role === 'marketing_adm' && (
          <TabsContent value="lost_reasons" className="mt-4">
            <LostReasonsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
