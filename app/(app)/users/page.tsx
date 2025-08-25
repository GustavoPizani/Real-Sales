// app/(app)/users/page.tsx

"use client";

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Users as UsersIcon, Shield, Crown, Star, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Role } from '@prisma/client'; // Importa o Enum Role do Prisma

// --- Tipos ---
interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  manager_id?: string | null;
  manager?: { name: string } | null;
  createdAt: string;
}

interface RoleSetting {
  roleName: Role;
  isActive: boolean;
}

// CORREÇÃO: Tipo explícito para o estado do formulário
interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: Role;
  manager_id: string;
}

const USER_ROLE_LABELS: Record<Role, string> = {
  [Role.marketing_adm]: "Administrador de Marketing",
  [Role.diretor]: "Diretor",
  [Role.gerente]: "Gerente",
  [Role.corretor]: "Corretor",
};

// --- Sub-componente: Gestão de Cargos ---
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

// --- Componente Principal da Página de Utilizadores ---
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // CORREÇÃO: Usa o tipo explícito 'UserFormData' para o estado do formulário
  const [userForm, setUserForm] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: Role.corretor,
    manager_id: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
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

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  const resetForm = () => {
    setUserForm({ name: '', email: '', password: '', role: Role.corretor, manager_id: '' });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const method = editingUser ? 'PATCH' : 'POST';
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar utilizador.');
      }
      
      toast({ title: 'Sucesso!', description: `Utilizador ${editingUser ? 'atualizado' : 'criado'} com sucesso.` });
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Tem a certeza que deseja excluir este utilizador? Esta ação é irreversível.')) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao excluir utilizador.');
        toast({ title: 'Sucesso!', description: 'Utilizador excluído.' });
        fetchData();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir o utilizador.' });
      }
    }
  };

  const openDialog = (user: User | null) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        manager_id: user.manager_id || ''
      });
    } else {
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role: Role.corretor, manager_id: '' });
    }
    setIsDialogOpen(true);
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

  if (loading) return <p className="p-6">A carregar...</p>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestão de Utilizadores</h1>
        <p className="text-gray-600">Gerencie a sua equipa e hierarquia organizacional</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Utilizadores</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
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
                  <TableCell>{user.manager?.name || '-'}</TableCell>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" value={userForm.name} onChange={(e) => setUserForm(p => ({...p, name: e.target.value}))} required />
            </div>
            <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={userForm.email} onChange={(e) => setUserForm(p => ({...p, email: e.target.value}))} required />
            </div>
            {!editingUser && (
                <div>
                    <Label htmlFor="password">Senha</Label>
                    <Input id="password" type="password" value={userForm.password} onChange={(e) => setUserForm(p => ({...p, password: e.target.value}))} required />
                </div>
            )}
            <div>
                <Label htmlFor="role">Cargo</Label>
                <Select value={userForm.role} onValueChange={(value: Role) => setUserForm(p => ({...p, role: value, manager_id: ''}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.entries(USER_ROLE_LABELS).filter(([role]) => role !== 'marketing_adm').map(([role, label]) => (
                            <SelectItem key={role} value={role}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {getAvailableManagers(userForm.role).length > 0 && (
                <div>
                    <Label htmlFor="manager_id">Responsável</Label>
                    <Select value={userForm.manager_id} onValueChange={(value) => setUserForm(p => ({...p, manager_id: value}))}>
                        <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                        <SelectContent>
                            {getAvailableManagers(userForm.role).map(manager => (
                                <SelectItem key={manager.id} value={manager.id}>{manager.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
