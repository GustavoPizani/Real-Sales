"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, UsersIcon, Shield, Crown, Star, User } from 'lucide-react';
import { User as UserType, USER_ROLES, USER_ROLE_LABELS } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

// Mock data
const mockUsers: UserType[] = [
  {
    id: '1',
    name: 'Admin Sistema',
    email: 'admin@realsales.com',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@realsales.com',
    role: 'diretor',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@realsales.com',
    role: 'gerente',
    manager_id: '2',
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: '4',
    name: 'Pedro Costa',
    email: 'pedro@realsales.com',
    role: 'gerente',
    manager_id: '2',
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: '5',
    name: 'Ana Oliveira',
    email: 'ana@realsales.com',
    role: 'corretor',
    manager_id: '3',
    created_at: '2024-02-15T00:00:00Z'
  },
  {
    id: '6',
    name: 'Carlos Ferreira',
    email: 'carlos@realsales.com',
    role: 'corretor',
    manager_id: '3',
    created_at: '2024-02-15T00:00:00Z'
  },
  {
    id: '7',
    name: 'Lucia Mendes',
    email: 'lucia@realsales.com',
    role: 'corretor',
    manager_id: '4',
    created_at: '2024-02-20T00:00:00Z'
  },
  {
    id: '8',
    name: 'Roberto Lima',
    email: 'roberto@realsales.com',
    role: 'corretor',
    manager_id: '4',
    created_at: '2024-02-20T00:00:00Z'
  }
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'corretor' as const,
    manager_id: ''
  });

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newUser: UserType = {
      id: Date.now().toString(),
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      manager_id: userForm.manager_id || undefined,
      created_at: new Date().toISOString()
    };
    
    setUsers(prev => [...prev, newUser]);
    resetForm();
    setShowAddUser(false);
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: 'corretor',
      manager_id: ''
    });
  };

  const getAvailableManagers = () => {
    if (userForm.role === 'diretor') {
      return []; // Diretor não tem superior
    } else if (userForm.role === 'gerente') {
      return users.filter(u => u.role === 'diretor');
    } else if (userForm.role === 'corretor') {
      return users.filter(u => u.role === 'gerente');
    }
    return [];
  };

  const getUserHierarchy = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.manager_id) return '';
    
    const manager = users.find(u => u.id === user.manager_id);
    return manager ? manager.name : '';
  };

  const canManageUser = (targetUser: UserType): boolean => {
    if (!currentUser) return false;
    
    // Admin pode gerenciar todos
    if (currentUser.role === 'admin') return true;
    
    // Diretor pode gerenciar gerentes e corretores
    if (currentUser.role === 'diretor') {
      return targetUser.role !== 'admin' && targetUser.role !== 'diretor';
    }
    
    // Gerente pode gerenciar apenas seus corretores
    if (currentUser.role === 'gerente') {
      return targetUser.manager_id === currentUser.id && targetUser.role === 'corretor';
    }
    
    return false;
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin') {
      return ['diretor', 'gerente', 'corretor'];
    } else if (currentUser?.role === 'diretor') {
      return ['gerente', 'corretor'];
    } else if (currentUser?.role === 'gerente') {
      return ['corretor'];
    }
    return [];
  };

  const filteredUsers = users.filter(user => {
    if (currentUser?.role === 'admin') return true;
    if (currentUser?.role === 'diretor') {
      return user.role !== 'admin';
    }
    if (currentUser?.role === 'gerente') {
      return user.manager_id === currentUser.id || user.id === currentUser.id;
    }
    return user.id === currentUser?.id;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'diretor':
        return <Crown className="h-4 w-4 text-purple-600" />;
      case 'gerente':
        return <Star className="h-4 w-4 text-blue-600" />;
      case 'corretor':
        return <User className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'diretor':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gerente':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'corretor':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600">Gerencie sua equipe e hierarquia organizacional</p>
        </div>
        
        {(currentUser?.role === 'admin' || currentUser?.role === 'diretor' || currentUser?.role === 'gerente') && (
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <Label htmlFor="role">Cargo</Label>
                  <Select
                    value={userForm.role}
                    onValueChange={(value: any) => setUserForm(prev => ({ ...prev, role: value, manager_id: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableRoles().map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(role)}
                            {USER_ROLE_LABELS[role as keyof typeof USER_ROLE_LABELS]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {userForm.role !== 'diretor' && getAvailableManagers().length > 0 && (
                  <div>
                    <Label htmlFor="manager">
                      {userForm.role === 'gerente' ? 'Diretor Responsável' : 'Gerente Responsável'}
                    </Label>
                    <Select
                      value={userForm.manager_id}
                      onValueChange={(value) => setUserForm(prev => ({ ...prev, manager_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableManagers().map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(manager.role)}
                              {manager.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    Adicionar Usuário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{filteredUsers.length}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredUsers.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Gerentes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredUsers.filter(u => u.role === 'gerente').length}
                </p>
              </div>
              <Star className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Corretores</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredUsers.filter(u => u.role === 'corretor').length}
                </p>
              </div>
              <User className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Gerencie os usuários da sua equipe e suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {USER_ROLE_LABELS[user.role]}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">
                          {getUserHierarchy(user.id) || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManageUser(user) && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserForm({
                                    name: user.name,
                                    email: user.email,
                                    password: '',
                                    role: user.role,
                                    manager_id: user.manager_id || ''
                                  });
                                }}
                                className="hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
                                    setUsers(prev => prev.filter(u => u.id !== user.id));
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
