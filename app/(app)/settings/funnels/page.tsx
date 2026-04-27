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
    id: string;
    name: string;
    isDefaultEntry: boolean;
    stages: Stage[];
}

interface Stage {
    id: string;
    name: string;
    order: number;
    color: string;
    funnelId: string;
}

export default function FunnelsSettingsPage() {
    const [funnels, setFunnels] = useState<Funnel[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewFunnelDialogOpen, setIsNewFunnelDialogOpen] = useState(false);
    const [newFunnelForm, setNewFunnelForm] = useState({ name: '', isDefaultEntry: false });
    const [editingFunnelData, setEditingFunnelData] = useState<Partial<Funnel>>({});
    const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
    const [isEditFunnelDialogOpen, setIsEditFunnelDialogOpen] = useState(false);
    const [stagesToUpdate, setStagesToUpdate] = useState<Stage[]>([]);
    const { toast } = useToast();

    const fetchFunnels = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/funnels');
            if (!response.ok) throw new Error("Falha ao carregar funis.");
            const data = await response.json();
            setFunnels(data || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchFunnels(); }, [fetchFunnels]);

    const handleCreateFunnel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/funnels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFunnelForm.name, isDefaultEntry: newFunnelForm.isDefaultEntry }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao criar funil.');
            }
            toast({ title: 'Sucesso!', description: 'Novo funil criado.' });
            setIsNewFunnelDialogOpen(false);
            setNewFunnelForm({ name: '', isDefaultEntry: false });
            fetchFunnels();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        }
    };

    const handleDeleteFunnel = async (funnelId: string) => {
        if (!window.confirm("Tem certeza que deseja apagar este funil e todas as suas etapas?")) return;
        try {
            const response = await fetch(`/api/funnels/${funnelId}`, { method: 'DELETE' });
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
        setEditingFunnelData({ name: funnel.name, isDefaultEntry: funnel.isDefaultEntry });
        setStagesToUpdate([...funnel.stages]);
        setIsEditFunnelDialogOpen(true);
    };

    const handleStageChange = (stageId: string, field: 'name' | 'color' | 'order', value: string | number) => {
        setStagesToUpdate(prev => prev.map(s => s.id === stageId ? { ...s, [field]: value } : s));
    };

    const handleAddStage = () => {
        const newStage: Stage = {
            id: `new-${Date.now()}`,
            name: 'Nova Etapa',
            color: '#cccccc',
            order: stagesToUpdate.length + 1,
            funnelId: editingFunnel!.id,
        };
        setStagesToUpdate(prev => [...prev, newStage]);
    };

    const handleRemoveStage = (stageId: string) => {
        setStagesToUpdate(prev => prev.filter(s => s.id !== stageId));
    };

    const handleSaveChanges = async () => {
        if (!editingFunnel) return;
        try {
            const response = await fetch(`/api/funnels/${editingFunnel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingFunnelData.name,
                    stages: stagesToUpdate.map((s, i) => ({
                        id: s.id.startsWith('new-') ? undefined : s.id,
                        name: s.name,
                        color: s.color,
                        order: i + 1,
                        funnelId: s.funnelId,
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
                                <Label htmlFor="funnelName">Nome do Funil</Label>
                                <Input id="funnelName" value={newFunnelForm.name} onChange={e => setNewFunnelForm(p => ({ ...p, name: e.target.value }))} required />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="isDefaultEntry" checked={newFunnelForm.isDefaultEntry} onCheckedChange={checked => setNewFunnelForm(p => ({ ...p, isDefaultEntry: checked }))} />
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {funnels.map(funnel => (
                    <Card key={funnel.id}>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{funnel.name}</CardTitle>
                                    {funnel.isDefaultEntry && <CardDescription className="text-secondary-custom font-semibold">Funil de Entrada Padrão</CardDescription>}
                                </div>
                                <div className="flex">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(funnel)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFunnel(funnel.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h4 className="font-semibold mb-2 text-sm">Etapas:</h4>
                            <div className="space-y-2">
                                {funnel.stages.map(stage => (
                                    <div key={stage.id} className="flex items-center gap-2 text-sm">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                                        <span>{stage.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isEditFunnelDialogOpen} onOpenChange={setIsEditFunnelDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Editar Funil: {editingFunnel?.name}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="editingFunnelName">Nome do Funil</Label>
                            <Input id="editingFunnelName" value={editingFunnelData.name || ''} onChange={e => setEditingFunnelData(prev => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <Separator />
                        <h3 className="font-semibold text-lg">Etapas</h3>
                        {stagesToUpdate.map(stage => (
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
