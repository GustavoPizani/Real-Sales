// c:\Users\gusta\Real-sales\app\(app)\settings\page.tsx
"use client";

import React, { useState, useEffect, useCallback, ReactNode, forwardRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { User as UserIcon, Bell, Shield, Users, Plus, Trash2, Edit, Crown, Star, Upload, Download, FileText, Loader2, CheckCircle, XCircle, ListX, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { type User, USER_ROLE_LABELS, Role } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

import Papa from 'papaparse';

interface RoleSetting {
  roleName: Role;
  isActive: boolean;
}

interface HierarchyUser {
  id: string;
  nome: string;
}

// --- Sub-componente: Gestão de Cargos ---
function RoleManagementCard({ settings, onUpdate }: { settings: RoleSetting[], onUpdate: () => void }) {
    const { toast } = useToast();

    const handleToggleRole = async (roleName: Role, isActive: boolean) => {
        try {
            const response = await fetch('/api/role-settings', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
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

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled title="O e-mail não pode ser alterado."/>
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
    
    // State for hierarchy form
    const [directors, setDirectors] = useState<HierarchyUser[]>([]);
    const [managers, setManagers] = useState<HierarchyUser[]>([]);
    const [selectedDirectorId, setSelectedDirectorId] = useState<string>('');
    
    interface UserFormData { name: string; email: string; password?: string; role: Role; superiorId?: string | null; }
    const [userForm, setUserForm] = useState<UserFormData>({ name: '', email: '', role: Role.corretor, superiorId: null });

    const fetchHierarchyData = useCallback(async () => {
        try {
            const directorsRes = await fetch('/api/users/hierarchy?role=diretor', {
                headers: { 'Content-Type': 'application/json' }
            });
            if (directorsRes.ok) {
                const directorsData = await directorsRes.json();
                setDirectors(directorsData);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar a lista de diretores.' });
        }
    }, [toast]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { 'Content-Type': 'application/json' };
            const [usersRes, rolesRes] = await Promise.all([
                fetch('/api/users'),
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

    useEffect(() => { 
        fetchData();
        fetchHierarchyData();
    }, [fetchData, fetchHierarchyData]);

    // Effect for cascading managers
    useEffect(() => {
        const fetchManagers = async () => {
            if (userForm.role === Role.corretor && selectedDirectorId) {
                const res = await fetch(`/api/users/hierarchy?role=gerente&superiorId=${selectedDirectorId}`, {
                    headers: { 'Content-Type': 'application/json' }
                });
                if (res.ok) {
                    const managersData = await res.json();
                    setManagers(managersData);
                }
            } else {
                setManagers([]);
            }
        };
        fetchManagers();
    }, [selectedDirectorId, userForm.role]);


    const openDialog = (user: User | null = null) => {
        if (user) {
            // Editing logic can be expanded here if needed
            setEditingUser(user);
            toast({ title: "Info", description: "A edição de hierarquia ainda não está implementada neste formulário."})
            setUserForm({
                name: user.name,
                email: user.email,
                password: '',
                role: user.role,
                superiorId: user.superiorId || ''
            });
        } else {
            // Reset for new user
            setEditingUser(null);
            setSelectedDirectorId('');
            setManagers([]);
            setUserForm({ name: '', email: '', password: '', role: Role.corretor, superiorId: null });
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm('Tem a certeza que deseja excluir este utilizador? Esta ação é irreversível.')) return;
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
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
        setSelectedDirectorId('');
        setManagers([]);
        setEditingUser(null);
        setIsDialogOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingUser ? 'PATCH' : 'POST';
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        
        let finalSuperiorId = null;
        if (userForm.role === Role.corretor) {
            finalSuperiorId = userForm.superiorId; // This will be the manager's ID
        } else if (userForm.role === Role.gerente) {
            finalSuperiorId = selectedDirectorId;
        }

        const body = { 
            name: userForm.name,
            email: userForm.email,
            password: userForm.password,
            role: userForm.role,
            superiorId: finalSuperiorId
        };

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
                headers: { 'Content-Type': 'application/json' },
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

    const getRoleIcon = (role: Role) => {
        const icons: Record<Role, React.ReactNode> = {
            [Role.marketing_adm]: <Shield className="h-4 w-4 text-red-600" />,
            [Role.diretor]: <Crown className="h-4 w-4 text-purple-600" />,
            [Role.gerente]: <Star className="h-4 w-4 text-blue-600" />,
            [Role.corretor]: <UserIcon className="h-4 w-4 text-green-600" />,
            [Role.pre_vendas]: <Users className="h-4 w-4 text-orange-600" />,
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
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
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
                        <CardTitle>Usuários cadastrados</CardTitle>
                        <CardDescription>Gerencie os Usuários da sua equipa e as suas permissões</CardDescription>
                    </div>
                    {currentUser?.role === 'marketing_adm' && (
                        <Button onClick={() => openDialog(null)}><Plus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
                    )}
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
                                <TableCell>{user.superior?.nome || '-'}</TableCell>
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
                            <Select value={userForm.role} onValueChange={(value: Role) => {
                                setUserForm(p => ({...p, role: value, superiorId: null}));
                                setSelectedDirectorId('');
                                setManagers([]);
                            }}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(USER_ROLE_LABELS)
                                        .filter(([role]) => role !== 'marketing_adm')
                                        .map(([role, label]) => (
                                            <SelectItem key={role} value={role}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {(userForm.role === Role.gerente || userForm.role === Role.corretor) && (
                            <div className="space-y-2">
                                <Label htmlFor="directorId">Diretor Responsável</Label>
                                <Select value={selectedDirectorId} onValueChange={(value) => {
                                    setSelectedDirectorId(value);
                                    setUserForm(p => ({...p, superiorId: null})); // Reset manager selection
                                }}>
                                    <SelectTrigger><SelectValue placeholder="Selecione um diretor" /></SelectTrigger>
                                    <SelectContent>
                                        {directors.map(dir => (
                                            <SelectItem key={dir.id} value={dir.id}>{dir.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {userForm.role === Role.corretor && (
                             <div className="space-y-2">
                                <Label htmlFor="superiorId">Gerente Responsável</Label>
                                <Select 
                                    value={userForm.superiorId || ''} 
                                    onValueChange={(value) => setUserForm(p => ({...p, superiorId: value}))}
                                    disabled={!selectedDirectorId || managers.length === 0}
                                >
                                    <SelectTrigger><SelectValue placeholder={!selectedDirectorId ? "Selecione um diretor primeiro" : "Selecione um gerente"} /></SelectTrigger>
                                    <SelectContent>
                                        {managers.map(manager => (
                                            <SelectItem key={manager.id} value={manager.id}>{manager.nome}</SelectItem>
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

// Componente de Input de Senha com botão de visualização
const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        {...props}
        ref={ref}
        className="pr-10"
      />
      <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={togglePasswordVisibility}>
        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

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

    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            <PasswordInput id="currentPassword" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} required/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <PasswordInput id="newPassword" name="newPassword" value={passwords.newPassword} onChange={handleChange} required/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <PasswordInput id="confirmPassword" name="confirmPassword" value={passwords.confirmPassword} onChange={handleChange} required/>
          </div>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Alterar Senha'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // 1. Verifica se o navegador suporta notificações push e service workers
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
    }
  }, []);

  // 2. Registra o Service Worker e verifica o status da inscrição atual
  useEffect(() => {
    if (!isSupported) return;

    const registerServiceWorker = async () => {
      try {
        const swRegistration = await navigator.serviceWorker.register('/sw.js');
        const existingSubscription = await swRegistration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setIsSubscribed(true);
          setSubscription(existingSubscription);
        }
      } catch (error) {
        console.error('Falha ao registrar Service Worker:', error);
      }
    };

    registerServiceWorker();
  }, [isSupported]);

  // 3. Função para ligar/desligar as notificações
  const handleToggleNotifications = async (enabled: boolean) => {
    if (!isSupported || !navigator.serviceWorker.ready) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Notificações push não são suportadas neste navegador.' });
      return;
    }

    const swRegistration = await navigator.serviceWorker.ready;

    if (enabled) {
      // Lógica para INSCREVER
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({ variant: 'destructive', title: 'Permissão Negada', description: 'Você precisa permitir as notificações no seu navegador.' });
        return;
      }

      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) throw new Error('Chave VAPID pública não encontrada.');
        
        const newSubscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify(newSubscription),
          headers: { 'Content-Type': 'application/json' },
        });

        setSubscription(newSubscription);
        setIsSubscribed(true);
        toast({ title: 'Sucesso!', description: 'Inscrição para notificações realizada.' });
      } catch (error) {
        console.error('Falha ao se inscrever:', error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível se inscrever para notificações.' });
        setIsSubscribed(false); // Reverte o estado do switch em caso de erro
      }
    } else if (subscription) {
      // Lógica para CANCELAR INSCRIÇÃO
      try {
        await subscription.unsubscribe();
        await fetch('/api/notifications/subscribe', { method: 'DELETE' });
        setSubscription(null);
        setIsSubscribed(false);
        toast({ title: 'Sucesso!', description: 'Inscrição para notificações removida.' });
      } catch (error) {
        console.error('Falha ao cancelar inscrição:', error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover a inscrição.' });
        setIsSubscribed(true); // Reverte o estado do switch em caso de erro
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificações</CardTitle>
        <CardDescription>Gerencie como você recebe notificações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="push-notifications" className="font-medium">Notificações Push</Label>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={!isSupported}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DataImportTab() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
      setImportResult(null); // Limpa resultados anteriores ao selecionar novo arquivo
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({ variant: "destructive", title: "Nenhum arquivo selecionado." });
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch('/api/clients/bulk-import', {
        method: 'POST',
        // O token é enviado via cookie httpOnly, não precisa do header Authorization
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao importar clientes.");
      }

      setImportResult(result);
      toast({ title: "Processamento concluído!", description: `${result.successCount} clientes importados com sucesso.` });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na Importação", description: error.message });
    } finally {
      setIsProcessing(false);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = ""; // Limpa o input do arquivo
      setFile(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importação de Clientes em Massa</CardTitle>
        <CardDescription>
          Importe múltiplos clientes de uma vez usando uma planilha CSV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold">Passo 1: Baixe a planilha modelo</h3>
          <p className="text-sm text-muted-foreground">
            Use este modelo para garantir que os dados estão no formato correto. A coluna 'nomeCompleto' é obrigatória.
          </p>
          <a href="/api/clients/template" download="modelo_clientes.xlsx">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Gerar Planilha Modelo (.xlsx)
            </Button>
          </a>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold">Passo 2: Faça o upload da sua planilha</h3>
          <p className="text-sm text-muted-foreground">
            Selecione o arquivo .xlsx preenchido para iniciar a importação.
          </p>
          <div className="flex items-center gap-2">
            <Input id="csv-upload" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFileChange} className="hidden" />
            <Label
              htmlFor="csv-upload"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              {file ? (
                <span className="truncate max-w-[200px]">{file.name}</span>
              ) : (
                "Escolher Planilha (.xlsx)"
              )}
            </Label>
            
            {file && (
                <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}

            <Button onClick={handleImport} disabled={!file || isProcessing} className="ml-auto">
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" /> Importar Clientes</>
              )}
            </Button>
          </div>
        </div>

        {importResult && (
          <Dialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Resultado da Importação</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center text-green-600"><CheckCircle className="mr-2 h-5 w-5" /> {importResult.successCount} Sucessos</span>
                    <span className="flex items-center text-red-600"><XCircle className="mr-2 h-5 w-5" /> {importResult.errorCount} Erros</span>
                  </div>
                </DialogDescription>
              </DialogHeader>
              {importResult.errorCount > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-2">
                  <h4 className="font-semibold">Detalhes dos Erros:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <DialogFooter>
                <DialogClose asChild><Button>Fechar</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function LostReasonsTab() {
  const { toast } = useToast();
  const [reasons, setReasons] = useState<{ id: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<{ id: string; reason: string } | null>(null);
  const [reasonForm, setReasonForm] = useState({ reason: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lost-reasons');
      if (!response.ok) throw new Error('Falha ao buscar motivos.');
      const data = await response.json();
      setReasons(data.reasons || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDialog = (reason: { id: string; reason: string } | null = null) => {
    if (reason) {
      setEditingReason(reason);
      setReasonForm({ reason: reason.reason });
    } else {
      setEditingReason(null);
      setReasonForm({ reason: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingReason ? 'PUT' : 'POST';
    const url = editingReason ? `/api/lost-reasons/${editingReason.id}` : '/api/lost-reasons';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reasonForm.reason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar motivo.');
      }
      toast({ title: 'Sucesso!', description: `Motivo ${editingReason ? 'atualizado' : 'criado'}.` });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const handleDelete = async (reasonId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este motivo?')) return;
    try {
      const response = await fetch(`/api/lost-reasons/${reasonId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao excluir motivo.');
      }
      toast({ title: 'Sucesso!', description: 'Motivo excluído.' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  if (loading) return <Card><CardContent className="p-6">Carregando...</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Motivos de Perda de Cliente</CardTitle>
          <CardDescription>Adicione, edite ou remova os motivos que aparecem ao marcar um cliente como 'Perdido'.</CardDescription>
        </div>
        <Button onClick={() => openDialog(null)}><Plus className="h-4 w-4 mr-2" /> Novo Motivo</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Motivo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {reasons.map((reason) => (
              <TableRow key={reason.id}>
                <TableCell className="font-medium">{reason.reason}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openDialog(reason)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(reason.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingReason ? 'Editar Motivo' : 'Novo Motivo de Perda'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Descrição do Motivo</Label>
              <Input id="reason" value={reasonForm.reason} onChange={(e) => setReasonForm({ reason: e.target.value })} required />
            </div>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'marketing_adm';

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações e preferências da sua conta.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-6' : 'grid-cols-3'}`}>
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-2" />Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="team"><Users className="h-4 w-4 mr-2" />Equipe</TabsTrigger>}
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Segurança</TabsTrigger>
          {isAdmin && <TabsTrigger value="import"><Upload className="h-4 w-4 mr-2" />Importação</TabsTrigger>}
          {isAdmin && <TabsTrigger value="lost-reasons"><ListX className="h-4 w-4 mr-2" />Motivos de Perda</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        {isAdmin && <TabsContent value="team"><TeamManagementTab /></TabsContent>}
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="security"><SecurityTab /></TabsContent>
        {isAdmin && <TabsContent value="import"><DataImportTab /></TabsContent>}
        {isAdmin && <TabsContent value="lost-reasons"><LostReasonsTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
