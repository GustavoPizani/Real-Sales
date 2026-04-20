"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Loader2, Edit } from "lucide-react";

interface Funnel {
    id: string; // Mantém 'id'
    nome: string; // Alterado de 'name' para 'nome' para corresponder à API
    isPreSales: boolean;
    isDefaultEntry: boolean;
    etapas: Stage[]; // Alterado de 'stages' para 'etapas' para corresponder à API
}

interface Stage {
    id: string;
    nome: string; // Alterado de 'name' para 'nome'
    ordem: number; // Alterado de 'order' para 'ordem'
    cor: string; // Alterado de 'color' para 'cor'
    funnelId: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function FunnelsSettingsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewFunnelDialogOpen, setIsNewFunnelDialogOpen] = useState(false);
    const [newFunnelForm, setNewFunnelForm] = useState({ name: '', isDefaultEntry: false });
    const [editingFunnelData, setEditingFunnelData] = useState<Partial<Funnel>>({}); // Usará 'nome'
    // --- Estados para Edição ---
    const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
    const [isEditFunnelDialogOpen, setIsEditFunnelDialogOpen] = useState(false);
    const [stagesToUpdate, setStagesToUpdate] = useState<Stage[]>([]);
    const { toast } = useToast();

    const fetchFunnels = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/funnels', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Falha ao carregar funis.");
            const data = await response.json(); // A API agora retorna um array diretamente
            setFunnels(data || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchFunnels();
    }, [fetchFunnels]);

    const handleCreateFunnel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('authToken');
            // Mapeia de volta para os nomes esperados pela API de criação (assumindo 'name')
            const response = await fetch('/api/funnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newFunnelForm.name, // Envia 'name' para a API
                    isDefaultEntry: newFunnelForm.isDefaultEntry
                }),
            });
            if (!response.ok) throw new Error('Falha ao criar funil.');
            toast({ title: 'Sucesso!', description: 'Novo funil criado.' });
            setIsNewFunnelDialogOpen(false);
            setNewFunnelForm({ name: '', isDefaultEntry: false });
            fetchFunnels();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const handleDeleteFunnel = async (funnelId: string) => {
        if (!window.confirm("Tem certeza que deseja apagar este funil e todas as suas etapas? Esta ação não pode ser desfeita.")) return;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/funnels/${funnelId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao apagar o funil.');
            }
            toast({ title: 'Sucesso!', description: 'Funil apagado.' });
            fetchFunnels();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const openEditDialog = (funnel: Funnel) => {
        setEditingFunnel(funnel);
        // Inicializa com 'nome' e 'etapas' do funil recebido
        setEditingFunnelData({ nome: funnel.nome, isPreSales: funnel.isPreSales, isDefaultEntry: funnel.isDefaultEntry });
        setStagesToUpdate([...funnel.etapas]); // Cria uma cópia para edição
        setIsEditFunnelDialogOpen(true);
    };

    const handleStageChange = (stageId: string, field: 'nome' | 'cor' | 'ordem', value: string | number) => {
        setStagesToUpdate(prev =>
            prev.map(stage => stage.id === stageId ? { ...stage, [field]: value } : stage)
        );
    };

    const handleAddStage = () => {
        // Cria nova etapa com nomes em português
        const newStage: Stage = {
            id: `new-${Date.now()}`,
            nome: 'Nova Etapa',
            cor: '#cccccc',
            ordem: stagesToUpdate.length + 1,
            // Estes campos podem não ser necessários para a UI, mas são parte da interface Stage
            funnelId: editingFunnel!.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setStagesToUpdate(prev => [...prev, newStage]);
    };

    const handleRemoveStage = (stageId: string) => {
        setStagesToUpdate(prev => prev.filter(stage => stage.id !== stageId));
    };

    const handleSaveChanges = async () => {
        if (!editingFunnel) return;

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/funnels/${editingFunnel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    // Mapeia de volta para os nomes esperados pela API de atualização (assumindo 'name' e 'stages')
                    name: editingFunnelData.nome, // Envia 'name' para a API
                    isPreSales: editingFunnelData.isPreSales,
                    stages: stagesToUpdate.map(s => ({
                        id: s.id.startsWith('new-') ? undefined : s.id, // Não envia id para novas etapas
                        name: s.nome, // Envia 'name' para a API
                        color: s.cor, // Envia 'color' para a API
                        order: s.ordem, // Envia 'order' para a API
                        funnelId: s.funnelId // Mantém funnelId
                    })),
                }),
            });

            if (!response.ok) throw new Error('Falha ao salvar as alterações.');

            toast({ title: 'Sucesso!', description: 'Funil atualizado.' });
            setIsEditFunnelDialogOpen(false);
            setEditingFunnel(null);
            fetchFunnels();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    if (loading) {
        return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gestão de Funis</h1>
                    <p className="text-muted-foreground">Crie e gerencie os funis de venda da sua equipe.</p>
                </div>
                <Dialog open={isNewFunnelDialogOpen} onOpenChange={setIsNewFunnelDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" /> Novo Funil</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Criar Novo Funil</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreateFunnel} className="space-y-4 pt-4">
                            <div>
                                <Label htmlFor="funnelNome">Nome do Funil</Label>
                                <Input id="funnelNome" value={newFunnelForm.name} onChange={(e) => setNewFunnelForm(p => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="isDefaultEntry" checked={newFunnelForm.isDefaultEntry} onCheckedChange={(checked) => setNewFunnelForm(p => ({ ...p, isDefaultEntry: checked }))} />
                                <Label htmlFor="isDefaultEntry">Funil de entrada padrão para novos leads</Label>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsNewFunnelDialogOpen(false)}>Cancelar</Button>
                                <Button type="submit">Criar Funil</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Ajustado para usar 'funil' e 'etapas' */}
                {funnels.map(funnel => ( // 'funnel' agora tem 'nome' e 'etapas'
                    <Card key={funnel.id}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{funnel.nome}</CardTitle> {/* Usando funnel.nome */}
                                    {funnel.isDefaultEntry && <CardDescription className="text-primary-custom font-semibold">Funil de Entrada Padrão</CardDescription>}
                                </div>
                                <div className="flex">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(funnel)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFunnel(funnel.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-semibold mb-2 text-sm">Etapas:</h4>
                            <div className="space-y-2"> {/* Usando funnel.etapas */}
                                {funnel.etapas.map(stage => (
                                    <div key={stage.id} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.cor }}></div> {/* Usando stage.cor */}
                                        <span>{stage.nome}</span> {/* Usando stage.nome */}
                                    </div>
                                ))}
                            </div>
                            {/* Aqui entraria a lógica para gerenciar o acesso de usuários */}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal de Edição de Funil */}
            <Dialog open={isEditFunnelDialogOpen} onOpenChange={setIsEditFunnelDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Editar Funil: {editingFunnel?.name}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editingFunnelName">Nome do Funil</Label>
                            <Input id="editingFunnelName" value={editingFunnelData.name || ''} onChange={e => setEditingFunnelData(prev => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="isPreSales" checked={editingFunnelData.isPreSales} onCheckedChange={checked => setEditingFunnelData(prev => ({ ...prev, isPreSales: checked }))} />
                            <Label htmlFor="isPreSales">Este é o funil de Pré-Vendas (define como entrada padrão)</Label>
                        </div>
                        <Separator />
                        <h3 className="font-semibold text-lg">Etapas</h3>
                        {stagesToUpdate.map((stage) => (
                            <div key={stage.id} className="flex items-center gap-2 p-2 border rounded-lg">
                                <Input value={stage.name} onChange={e => handleStageChange(stage.id, 'name', e.target.value)} placeholder="Nome da Etapa" />
                                <Input type="color" value={stage.color} onChange={e => handleStageChange(stage.id, 'color', e.target.value)} className="w-12 h-10 p-1" />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveStage(stage.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        ))}
                        <Separator />
                        <Button variant="outline" onClick={handleAddStage} className="w-full">
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Nova Etapa
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditFunnelDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveChanges}>Salvar Alterações</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
