// app/(app)/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User as UserIcon, Bell, Shield, Users, Plus, Trash2, Edit, Crown, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { type User, USER_ROLE_LABELS, Role } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

interface RoleSetting {
  roleName: Role;
  isActive: boolean;
}

// --- Sub-componente: Gestão de Cargos ---
// Este componente foi extraído da sua página de usuários e integrado aqui.
function RoleManagementCard({ settings, onUpdate }: { settings: RoleSetting[], onUpdate: () => void }) {
    const { toast } = useToast();

    const handleToggleRole = async (roleName: Role, isActive: boolean) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/role-settings', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roleName, isActive }),
            });
            if (!response.ok) throw new Error('Falha ao atualizar o cargo.');
            toast({ title: 'Sucesso!', description: 'Status do cargo atualizado.' });
            onUpdate();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o cargo.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestão de Cargos da Hierarquia</CardTitle>
                <CardDescription>Ative ou desative cargos para adaptar a pirâmide à sua imobiliária.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {settings.map(setting => (
                    <div key={setting.roleName} className="flex items-center justify-between rounded-lg border p-4">
                        <Label htmlFor={`role-${setting.roleName}`} className="font-medium">
                            {USER_ROLE_LABELS[setting.roleName]}
                        </Label>
                        <Switch
                            id={`role-${setting.roleName}`}
                            checked={setting.isActive}
                            onCheckedChange={(checked) => handleToggleRole(setting.roleName, checked)}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
function ProfileTab() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name, email: user.email });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formData.name, email: formData.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar perfil.');
      }

      const updatedUserData = await response.json();
      
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedUserData.user } : null);

      toast({ title: 'Sucesso!', description: 'Perfil atualizado com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <Card><CardContent className="p-6">Carregando...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Atualize as informações da sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TeamManagementTab() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [roleSettings, setRoleSettings] = useState<RoleSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    interface UserFormData { name: string; email: string; password?: string; role: Role; superiorId?: string | null; }
    const [userForm, setUserForm] = useState<UserFormData>({ name: '', email: '', role: Role.corretor, superiorId: null });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            const headers = { 'Authorization': `Bearer ${token}` };
            const [usersRes, rolesRes] = await Promise.all([
                fetch('/api/users', { headers }),
                fetch('/api/role-settings', { headers })
            ]);

            if (!usersRes.ok || !rolesRes.ok) throw new Error('Falha ao buscar dados');
            
            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();

            setUsers(usersData.users || []);
            setRoleSettings(rolesData.settings || []);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os dados da página.' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openDialog = (user: User | null = null) => {
        if (user) {
            setEditingUser(user);
            setUserForm({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                superiorId: user.superiorId || ''
            });
        } else {
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: Role.corretor, superiorId: null });
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm('Tem a certeza que deseja excluir este utilizador? Esta ação é irreversível.')) return;
        const token = localStorage.getItem('authToken');
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao excluir utilizador.');
            }
            toast({ title: 'Sucesso!', description: 'Usuário deletado.' });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const resetForm = () => {
        setUserForm({ name: '', email: '', password: '', role: Role.corretor, superiorId: null });
        setEditingUser(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('authToken');
        const method = editingUser ? 'PATCH' : 'POST';
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        
        const body = { ...userForm };
        if (!editingUser && !body.password) {
            toast({ variant: 'destructive', title: 'Erro', description: 'A senha é obrigatória para novos usuários.' });
            return;
        }
        if (editingUser && !body.password) {
            delete body.password;
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao salvar usuário.');
            }
            toast({ title: 'Sucesso!', description: `Usuário ${editingUser ? 'atualizado' : 'criado'}.` });
            resetForm();
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const getAvailableManagers = (role: Role) => {
        const isDiretorActive = roleSettings.find(r => r.roleName === Role.diretor)?.isActive ?? false;
        const isGerenteActive = roleSettings.find(r => r.roleName === Role.gerente)?.isActive ?? false;

        if (role === Role.gerente && isDiretorActive) {
            return users.filter(u => u.role === Role.diretor);
        }
        if (role === Role.corretor) {
            if (isGerenteActive) return users.filter(u => u.role === Role.gerente);
            if (isDiretorActive) return users.filter(u => u.role === Role.diretor);
        }
        return [];
    };

    const getRoleIcon = (role: Role) => {
        const icons: Record<Role, React.ReactNode> = {
            [Role.marketing_adm]: <Shield className="h-4 w-4 text-red-600" />,
            [Role.diretor]: <Crown className="h-4 w-4 text-purple-600" />,
            [Role.gerente]: <Star className="h-4 w-4 text-blue-600" />,
            [Role.corretor]: <UserIcon className="h-4 w-4 text-green-600" />,
        };
        return icons[role] || null;
    };

    const stats = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {} as Record<Role, number>);

    if (loading) return <Card><CardContent className="p-6">A carregar...</CardContent></Card>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Utilizadores</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{users.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.marketing_adm || 0}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
                        <Star className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.gerente || 0}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Corretores</CardTitle>
                        <UserIcon className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{stats.corretor || 0}</div></CardContent>
                </Card>
            </div>

            {currentUser?.role === 'marketing_adm' && (
                <RoleManagementCard settings={roleSettings} onUpdate={fetchData} />
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Lista de Utilizadores</CardTitle>
                        <CardDescription>Gerencie os utilizadores da sua equipa e as suas permissões</CardDescription>
                    </div>
                    <Button onClick={() => openDialog(null)}><Plus className="h-4 w-4 mr-2" /> Novo Utilizador</Button>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Utilizador</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Data de Cadastro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="font-medium">{user.name}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="flex items-center gap-2 w-fit">
                                        {getRoleIcon(user.role)}
                                        {USER_ROLE_LABELS[user.role]}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.superior?.name || '-'}</TableCell>
                                <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy') : '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openDialog(user)}><Edit className="h-4 w-4" /></Button>
                                    {currentUser?.id !== user.id && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Editar Utilizador' : 'Adicionar Novo Utilizador'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input id="name" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha {editingUser && "(Opcional)"}</Label>
                            <Input id="password" type="password" placeholder={editingUser ? "Deixe em branco para não alterar" : ""} onChange={(e) => setUserForm({...userForm, password: e.target.value})} required={!editingUser} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Cargo</Label>
                            <Select value={userForm.role} onValueChange={(value: Role) => setUserForm(p => ({...p, role: value, superiorId: ''}))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(USER_ROLE_LABELS).filter(([role]) => role !== 'marketing_adm').map(([role, label]) => (
                                        <SelectItem key={role} value={role}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {getAvailableManagers(userForm.role).length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="superiorId">Responsável</Label>
                                <Select value={userForm.superiorId || ''} onValueChange={(value) => setUserForm(p => ({...p, superiorId: value}))}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um gerente ou diretor" /></SelectTrigger>
                                    <SelectContent>
                                        {getAvailableManagers(userForm.role).map(manager => (
                                            <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SecurityTab() {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ variant: 'destructive', title: 'Erro', description: 'As novas senhas não coincidem.' });
      return;
    }
    if (!passwords.newPassword || passwords.newPassword.length < 6) {
        toast({ variant: 'destructive', title: 'Erro', description: 'A nova senha deve ter pelo menos 6 caracteres.' });
        return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao alterar a senha.');
      }

      toast({ title: 'Sucesso!', description: 'Senha alterada com sucesso.' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segurança</CardTitle>
        <CardDescription>Altere sua senha aqui. Após a alteração, você será desconectado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input id="currentPassword" name="currentPassword" type="password" value={passwords.currentPassword} onChange={handleChange} required/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input id="newPassword" name="newPassword" type="password" value={passwords.newPassword} onChange={handleChange} required/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" value={passwords.confirmPassword} onChange={handleChange} required/>
          </div>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Alterar Senha'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [taskReminder, setTaskReminder] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
      setNewClient(localStorage.getItem('notif_new_client') === 'true');
      setTaskReminder(localStorage.getItem('notif_task_reminder') === 'true');
    }
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Este navegador não suporta notificações.' });
      return;
    }
    if (Notification.permission === 'granted') {
        toast({ title: 'Info', description: 'As notificações já estão ativadas.' });
        return;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast({ title: 'Sucesso!', description: 'Notificações ativadas.' });
      } else {
        toast({ variant: 'destructive', title: 'Aviso', description: 'Permissão para notificações negada.' });
      }
    } else {
        toast({ variant: 'destructive', title: 'Aviso', description: 'As notificações estão bloqueadas nas configurações do seu navegador.' });
    }
  };

  const handlePreferenceChange = (type: 'newClient' | 'taskReminder', value: boolean) => {
    if (!notificationsEnabled) {
        toast({ variant: 'destructive', title: 'Aviso', description: 'Ative as notificações do navegador primeiro.' });
        return;
    }
    if (type === 'newClient') {
        setNewClient(value);
        localStorage.setItem('notif_new_client', String(value));
    } else if (type === 'taskReminder') {
        setTaskReminder(value);
        localStorage.setItem('notif_task_reminder', String(value));
    }
    toast({ title: 'Preferência salva!' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Gerencie como você recebe notificações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Notificações do Navegador</Label>
            <CardDescription>Receba notificações push diretamente no seu navegador.</CardDescription>
          </div>
          <Button onClick={handleRequestPermission} disabled={notificationsEnabled}>
            {notificationsEnabled ? 'Ativadas' : 'Ativar'}
          </Button>
        </div>
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Tipos de Notificação</h3>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="new-client-notif">Novo Cliente</Label>
                    <p className="text-sm text-muted-foreground">Receber notificação quando um novo cliente for cadastrado.</p>
                </div>
                <Switch id="new-client-notif" checked={newClient} onCheckedChange={(checked) => handlePreferenceChange('newClient', checked)} disabled={!notificationsEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="task-reminder-notif">Lembrete de Tarefa</Label>
                    <p className="text-sm text-muted-foreground">Receber notificação 10 minutos antes de uma tarefa agendada.</p>
                </div>
                <Switch id="task-reminder-notif" checked={taskReminder} onCheckedChange={(checked) => handlePreferenceChange('taskReminder', checked)} disabled={!notificationsEnabled} />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações e preferências da sua conta.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-2" />Perfil</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-2" />Equipe</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Segurança</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="team"><TeamManagementTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
      </Tabs>
    </div>
  );
}