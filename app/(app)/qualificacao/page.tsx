"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCheck, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';

function LeadCard({ lead, onAssign, isAssignable }) {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssign(lead.id);
      toast({ title: "Sucesso!", description: `Lead "${lead.nomeCompleto}" atribuído a você.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na Atribuição", description: error.message });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg flex justify-between items-center">
      <div>
        <p className="font-semibold">{lead.nomeCompleto}</p>
        <p className="text-sm text-muted-foreground">Origem: {lead.funnel?.name || 'N/A'}</p>
      </div>
      <Button onClick={handleAssign} disabled={!isAssignable || isAssigning}>
        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atribuir para Mim"}
      </Button>
    </div>
  );
}

function AtribuicaoTab() {
  const { toast } = useToast();
  const [leads, setLeads] = useState({ paraMim: [], bolsaoPrioritario: [], bolsaoGeral: [] });
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/qualificacao/atribuicao', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast({ variant: "destructive", title: "Erro de Localização", description: "Não foi possível obter sua localização." })
    );
  }, [fetchLeads, toast]);

  const assignLead = async (leadId: string) => {
    if (!userLocation) throw new Error("Localização do usuário não disponível.");
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/qualificacao/atribuicao', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        userLatitude: userLocation.lat,
        userLongitude: userLocation.lng,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    fetchLeads(); // Re-fetch leads after assignment
  };

  if (loading) return <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Para Mim</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leads.paraMim.map(lead => <LeadCard key={lead.id} lead={lead} onAssign={assignLead} isAssignable={true} />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bolsão Prioritário</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leads.bolsaoPrioritario.map(lead => <LeadCard key={lead.id} lead={lead} onAssign={assignLead} isAssignable={!!userLocation} />)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bolsão Geral</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {leads.bolsaoGeral.map(lead => <LeadCard key={lead.id} lead={lead} onAssign={assignLead} isAssignable={!!userLocation} />)}
        </CardContent>
      </Card>
    </div>
  );
}

function ConfiguracaoTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState({ raioAtribuicaoMetros: 0, tempoAteBolsaoPrioritarioMinutos: 0, tempoAteBolsaoGeralMinutos: 0 });
  const [users, setUsers] = useState<{id: string, nome: string}[]>([]);
  const [permissions, setPermissions] = useState<{prioritario: string[], geral: string[]}>({ prioritario: [], geral: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    fetch('/api/qualificacao/configuracao', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setConfig(data.config);
        setUsers(data.users);
        setPermissions(data.permissions);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    await fetch('/api/qualificacao/configuracao', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ configData: config, permissions: permissions }),
    });
    toast({ title: "Sucesso!", description: "Configurações salvas." });
  };

  const handlePermissionChange = (pool: 'prioritario' | 'geral', userId: string, checked: boolean) => {
    setPermissions(prev => {
      const currentPoolPermissions = prev[pool];
      const newPoolPermissions = checked
        ? [...currentPoolPermissions, userId]
        : currentPoolPermissions.filter(id => id !== userId);
      return { ...prev, [pool]: newPoolPermissions };
    });
  };

  if (loading) return <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" />;

  return (
    <Card>
      <CardHeader><CardTitle>Configurações do Bolsão de Leads</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="tempoPrioritario">Tempo para Bolsão Prioritário (minutos)</Label>
            <Input id="tempoPrioritario" type="number" value={config.tempoAteBolsaoPrioritarioMinutos} onChange={e => setConfig(c => ({ ...c, tempoAteBolsaoPrioritarioMinutos: Number(e.target.value) }))} />
          </div>
          <div>
            <Label htmlFor="tempoGeral">Tempo para Bolsão Geral (minutos)</Label>
            <Input id="tempoGeral" type="number" value={config.tempoAteBolsaoGeralMinutos} onChange={e => setConfig(c => ({ ...c, tempoAteBolsaoGeralMinutos: Number(e.target.value) }))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <h3 className="font-semibold mb-2">Permissões - Bolsão Prioritário</h3>
              <div className="space-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox id={`prioritario-${user.id}`} checked={permissions.prioritario.includes(user.id)} onCheckedChange={(checked) => handlePermissionChange('prioritario', user.id, !!checked)} />
                    <label htmlFor={`prioritario-${user.id}`} className="text-sm font-medium leading-none">{user.nome}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Permissões - Bolsão Geral</h3>
              <div className="space-y-2 p-3 border rounded-md max-h-60 overflow-y-auto">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox id={`geral-${user.id}`} checked={permissions.geral.includes(user.id)} onCheckedChange={(checked) => handlePermissionChange('geral', user.id, !!checked)} />
                    <label htmlFor={`geral-${user.id}`} className="text-sm font-medium leading-none">{user.nome}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4"><Button type="submit">Salvar Configurações</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function QualificacaoPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
      <h1 className="text-3xl font-bold">Qualificação de Leads</h1>
      <Tabs defaultValue="atribuicao" className="w-full">
        <TabsList className={`grid w-full ${user?.role === 'marketing_adm' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="atribuicao"><UserCheck className="h-4 w-4 mr-2" /> Atribuição</TabsTrigger>
          {user?.role === 'marketing_adm' && <TabsTrigger value="configuracao"><Users className="h-4 w-4 mr-2" /> Configuração</TabsTrigger>}
        </TabsList>
        <TabsContent value="atribuicao" className="mt-6"><AtribuicaoTab /></TabsContent>
        {user?.role === 'marketing_adm' && <TabsContent value="configuracao" className="mt-6"><ConfiguracaoTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
