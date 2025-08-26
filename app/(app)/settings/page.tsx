// app/(app)/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User as UserIcon, Bell, Shield, CreditCard, Users, Plus, Trash2, Edit, Crown, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { type User, USER_ROLE_LABELS, Role } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

// Sub-componente movido para dentro do arquivo principal para simplicidade
function TeamManagementTab() {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    interface UserFormData { name: string; email: string; password: string; role: Role; superiorId: string; }
    const [userForm, setUserForm] = useState<UserFormData>({ name: '', email: '', password: '', role: Role.corretor, superiorId: '' });

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        const usersRes = await fetch('/api/users', { headers });
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData.users || []);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => {
        setUserForm({ name: '', email: '', password: '', role: Role.corretor, superiorId: '' });
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(userForm),
            });
            if (!response.ok) throw new Error('Falha ao salvar usuário.');
            toast({ title: 'Sucesso!', description: `Usuário ${editingUser ? 'atualizado' : 'criado'}.` });
            resetForm();
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };
    
    // O resto da lógica de `users/page.tsx` (handleDelete, openDialog, etc.) vai aqui...

    return (
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                 <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage your team members and their roles</CardDescription>
                  </div>
                  <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Invite User</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    {/* ... Tabela de usuários conforme Settings.txt e users/page.tsx ... */}
                </Table>
            </CardContent>
            {/* ... Dialog para criar/editar usuário ... */}
        </Card>
    );
}


export default function SettingsPage() {
  const { toast } = useToast();
  // Lógica dos outros tabs (Profile, Billing, etc.) pode ser adicionada aqui...

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 mr-2" />Team</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-2" />Billing</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" />Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">{/* ... Conteúdo do Perfil ... */}</TabsContent>
        <TabsContent value="team"><TeamManagementTab /></TabsContent>
        <TabsContent value="billing">{/* ... Conteúdo de Faturamento ... */}</TabsContent>
        <TabsContent value="notifications">{/* ... Conteúdo de Notificações ... */}</TabsContent>
        <TabsContent value="security">{/* ... Conteúdo de Segurança ... */}</TabsContent>
      </Tabs>
    </div>
  );
}