"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Lock, Bell, Plus, Edit, AlertTriangle } from 'lucide-react';
import { LostReason, DEFAULT_LOST_REASONS } from '@/lib/types';

// Mock data para motivos de perda
const mockLostReasons: LostReason[] = DEFAULT_LOST_REASONS.map((reason, index) => ({
  id: (index + 1).toString(),
  reason,
  active: true,
  created_at: '2024-01-01T00:00:00Z'
}));

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [lostReasons, setLostReasons] = useState<LostReason[]>([]);
  const [showAddReason, setShowAddReason] = useState(false);
  const [editingReason, setEditingReason] = useState<LostReason | null>(null);
  const [reasonForm, setReasonForm] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      // Simular carregamento dos motivos de perda
      setTimeout(() => {
        setLostReasons(mockLostReasons);
      }, 500);
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Perfil atualizado com sucesso!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage('As senhas não coincidem!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setMessage('Senha atualizada com sucesso!');
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newReason: LostReason = {
      id: Date.now().toString(),
      reason: reasonForm,
      active: true,
      created_at: new Date().toISOString()
    };
    
    setLostReasons(prev => [...prev, newReason]);
    setReasonForm('');
    setShowAddReason(false);
  };

  const handleEditReason = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingReason) return;

    const updatedReason = {
      ...editingReason,
      reason: reasonForm
    };
    
    setLostReasons(prev => 
      prev.map(reason => 
        reason.id === editingReason.id ? updatedReason : reason
      )
    );
    setEditingReason(null);
    setReasonForm('');
  };

  const handleToggleReason = async (reason: LostReason) => {
    const updatedReason = {
      ...reason,
      active: !reason.active
    };
    
    setLostReasons(prev => 
      prev.map(r => 
        r.id === reason.id ? updatedReason : r
      )
    );
  };

  const openEditDialog = (reason: LostReason) => {
    setEditingReason(reason);
    setReasonForm(reason.reason);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e configurações da conta</p>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Perfil do Usuário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>
            Atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Altere sua senha para manter sua conta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme a nova senha"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Motivos de Perda de Cliente - Apenas para Admin */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Motivos de Perda de Cliente
            </CardTitle>
            <CardDescription>
              Gerencie os motivos disponíveis para marcar clientes como perdidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600">
                Configure os motivos que os corretores podem selecionar ao marcar um cliente como perdido.
              </p>
              <Dialog open={showAddReason} onOpenChange={setShowAddReason}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Motivo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Motivo</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddReason} className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Motivo</Label>
                      <Input
                        id="reason"
                        value={reasonForm}
                        onChange={(e) => setReasonForm(e.target.value)}
                        placeholder="Ex: Preço muito alto"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddReason(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-primary hover:bg-primary/90">
                        Adicionar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

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
                  {lostReasons.map((reason) => (
                    <TableRow key={reason.id}>
                      <TableCell className="font-medium">{reason.reason}</TableCell>
                      <TableCell>
                        <Switch
                          checked={reason.active}
                          onCheckedChange={() => handleToggleReason(reason)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(reason.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(reason)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Notificação
          </CardTitle>
          <CardDescription>
            Configure quando e como você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações Gerais</Label>
              <p className="text-sm text-gray-600">
                Receber notificações sobre atualizações importantes
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Novos Clientes</Label>
              <p className="text-sm text-gray-600">
                Notificar quando um novo cliente for adicionado
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mudanças no Pipeline</Label>
              <p className="text-sm text-gray-600">
                Notificar quando clientes mudarem de status
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lembretes de Follow-up</Label>
              <p className="text-sm text-gray-600">
                Lembrar de entrar em contato com clientes inativos
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Relatórios Semanais</Label>
              <p className="text-sm text-gray-600">
                Receber resumo semanal das atividades
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edição de Motivo */}
      <Dialog open={!!editingReason} onOpenChange={() => setEditingReason(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Motivo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditReason} className="space-y-4">
            <div>
              <Label htmlFor="edit_reason">Motivo</Label>
              <Input
                id="edit_reason"
                value={reasonForm}
                onChange={(e) => setReasonForm(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingReason(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Zona de Perigo */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis que afetam permanentemente sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-red-600">Excluir Conta</h4>
              <p className="text-sm text-gray-600 mb-2">
                Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.
              </p>
              <Button variant="destructive" size="sm">
                Excluir Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
