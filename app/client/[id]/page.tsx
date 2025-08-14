"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, MessageCircle, Building, Calendar, User, Plus, Trophy, X, RotateCcw, DollarSign, CalendarPlus, CheckSquare, Mail } from 'lucide-react';
import { Client, ClientNote, Property, ClientWonDetails, LostReason, FUNNEL_STAGES, DEFAULT_LOST_REASONS, CreateTaskData, TASK_TYPES, TASK_PRIORITIES, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/lib/types';
import { useTask } from '@/contexts/task-context';

// Mock data
const mockClient: Client = {
  id: '1',
  full_name: 'Maria Silva',
  phone: '(11) 99999-9999',
  email: 'maria@email.com',
  funnel_status: 'Contato',
  notes: 'Interessada em apartamento 3 quartos',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  user_id: '1',
  property_title: 'Apartamento 3 quartos Vila Madalena',
  property_address: 'Rua Harmonia, 123 - Vila Madalena',
  property_price: 850000,
  assigned_user: { id: '1', name: 'João Corretor', email: 'joao@email.com', role: 'corretor', created_at: '2024-01-01T00:00:00Z' },
  status: 'active'
};

const mockNotes: ClientNote[] = [
  {
    id: '1',
    client_id: '1',
    user_id: '1',
    note: 'Cliente muito interessado, quer agendar visita para o próximo sábado.',
    created_at: '2024-01-16T14:30:00Z',
    user_name: 'João Corretor'
  },
  {
    id: '2',
    client_id: '1',
    user_id: '1',
    note: 'Ligou perguntando sobre financiamento. Orientei sobre as opções disponíveis.',
    created_at: '2024-01-17T09:15:00Z',
    user_name: 'João Corretor'
  }
];

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Apartamento 3 quartos Vila Madalena',
    description: 'Lindo apartamento com varanda',
    address: 'Rua Harmonia, 123 - Vila Madalena',
    price: 850000,
    type: 'Apartamento',
    status: 'Disponível',
    created_at: '2024-01-01T00:00:00Z',
    user_id: '1'
  }
];

const mockLostReasons: LostReason[] = DEFAULT_LOST_REASONS.map((reason, index) => ({
  id: (index + 1).toString(),
  reason,
  active: true,
  created_at: '2024-01-01T00:00:00Z'
}));

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { createTask } = useTask();
  
  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [lostReasons, setLostReasons] = useState<LostReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showAddSaleDialog, setShowAddSaleDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  const [clientForm, setClientForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    funnel_status: 'Contato',
    notes: ''
  });

  const [wonForm, setWonForm] = useState({
    property_id: '',
    sale_value: '',
    sale_date: new Date().toISOString().split('T')[0]
  });

  const [lostForm, setLostForm] = useState({
    reason: ''
  });

  const [taskForm, setTaskForm] = useState<CreateTaskData>({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:00',
    priority: 'medium',
    type: 'call',
    client_id: clientId,
    property_id: '',
    user_id: '1'
  });

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setClient(mockClient);
      setNotes(mockNotes);
      setProperties(mockProperties);
      setLostReasons(mockLostReasons);
      
      if (mockClient) {
        setClientForm({
          full_name: mockClient.full_name,
          phone: mockClient.phone || '',
          email: mockClient.email || '',
          funnel_status: mockClient.funnel_status,
          notes: mockClient.notes || ''
        });
      }
      
      setLoading(false);
    }, 1000);
  }, [clientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    
    const note: ClientNote = {
      id: Date.now().toString(),
      client_id: clientId,
      user_id: '1',
      note: newNote,
      created_at: new Date().toISOString(),
      user_name: 'João Corretor'
    };
    
    setNotes(prev => [note, ...prev]);
    setNewNote('');
    setIsAddingNote(false);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (client) {
      const updatedClient = {
        ...client,
        ...clientForm
      };
      setClient(updatedClient);
    }
    
    setEditingClient(false);
  };

  const handleMarkAsWon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (client) {
      const wonDetails: ClientWonDetails = {
        id: Date.now().toString(),
        client_id: clientId,
        property_id: wonForm.property_id,
        property_title: properties.find(p => p.id === wonForm.property_id)?.title || '',
        sale_value: parseFloat(wonForm.sale_value),
        sale_date: wonForm.sale_date,
        created_at: new Date().toISOString()
      };
      
      const updatedClient = {
        ...client,
        status: 'won' as const,
        won_details: [wonDetails]
      };
      
      setClient(updatedClient);
      setShowWonDialog(false);
      setWonForm({
        property_id: '',
        sale_value: '',
        sale_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleMarkAsLost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (client) {
      const updatedClient = {
        ...client,
        status: 'lost' as const,
        lost_reason: lostForm.reason
      };
      
      setClient(updatedClient);
      setShowLostDialog(false);
      setLostForm({ reason: '' });
    }
  };

  const handleReactivateClient = async () => {
    if (client) {
      const updatedClient = {
        ...client,
        status: 'active' as const,
        lost_reason: undefined
      };
      
      setClient(updatedClient);
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (client && client.won_details) {
      const newSale: ClientWonDetails = {
        id: Date.now().toString(),
        client_id: clientId,
        property_id: wonForm.property_id,
        property_title: properties.find(p => p.id === wonForm.property_id)?.title || '',
        sale_value: parseFloat(wonForm.sale_value),
        sale_date: wonForm.sale_date,
        created_at: new Date().toISOString()
      };
      
      const updatedClient = {
        ...client,
        won_details: [...client.won_details, newSale]
      };
      
      setClient(updatedClient);
      setShowAddSaleDialog(false);
      setWonForm({
        property_id: '',
        sale_value: '',
        sale_date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      ...taskForm,
      client_id: clientId,
      client_name: client?.full_name
    };
    
    await createTask(taskData);
    setShowTaskDialog(false);
    setTaskForm({
      title: '',
      description: '',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '09:00',
      priority: 'medium',
      type: 'call',
      client_id: clientId,
      property_id: '',
      user_id: '1'
    });
    
    // Mostrar feedback de sucesso
    alert('Tarefa criada com sucesso!');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleScheduleGoogleCalendar = () => {
    if (!client) return;
    
    const eventTitle = `Visita ao ${client.property_title || 'imóvel'}`;
    const eventDescription = `Visita agendada com ${client.full_name}`;
    const eventLocation = client.property_address || '';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    const startTime = tomorrow.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(tomorrow.getTime() + 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const attendees = [client.email].filter(Boolean).join(',');
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(eventDescription)}&location=${encodeURIComponent(eventLocation)}&add=${encodeURIComponent(attendees)}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Contato': 'bg-blue-100 text-blue-800',
      'Diagnóstico': 'bg-yellow-100 text-yellow-800',
      'Agendado': 'bg-purple-100 text-purple-800',
      'Visitado': 'bg-orange-100 text-orange-800',
      'Proposta': 'bg-indigo-100 text-indigo-800',
      'Contrato': 'bg-green-100 text-green-800',
      'Ganho': 'bg-emerald-100 text-emerald-800',
      'Perdido': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getClientStatusBadge = () => {
    if (client?.status === 'won') {
      return <Badge className="bg-emerald-100 text-emerald-800">Cliente Ganho</Badge>;
    } else if (client?.status === 'lost') {
      return <Badge className="bg-red-100 text-red-800">Cliente Perdido</Badge>;
    }
    return <Badge className={getStatusColor(client?.funnel_status || '')}>
      {client?.funnel_status}
    </Badge>;
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <Building className="h-4 w-4" />;
      case 'call':
        return <MessageCircle className="h-4 w-4" />;
      case 'follow_up':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <User className="h-4 w-4" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
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

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Cliente não encontrado</h1>
          <Button onClick={() => router.push('/pipeline')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Pipeline
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/pipeline')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Pipeline
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.full_name}</h1>
            <p className="text-gray-600">Detalhes e histórico do cliente</p>
          </div>
        </div>
        <div className="flex gap-2">
          {client.phone && (
            <Button
              variant="outline"
              onClick={() => openWhatsApp(client.phone!)}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          
          {/* Botões de ação baseados no status */}
          {client.status === 'lost' ? (
            <Button
              onClick={handleReactivateClient}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reativar Cliente
            </Button>
          ) : client.status === 'won' ? (
            <Dialog open={showAddSaleDialog} onOpenChange={setShowAddSaleDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Venda
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Venda</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSale} className="space-y-4">
                  <div>
                    <Label htmlFor="add_property">Imóvel Vendido *</Label>
                    <Select
                      value={wonForm.property_id}
                      onValueChange={(value) => setWonForm(prev => ({ ...prev, property_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="add_sale_value">Valor da Venda (R$) *</Label>
                    <Input
                      id="add_sale_value"
                      type="number"
                      step="0.01"
                      value={wonForm.sale_value}
                      onChange={(e) => setWonForm(prev => ({ ...prev, sale_value: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="add_sale_date">Data da Venda *</Label>
                    <Input
                      id="add_sale_date"
                      type="date"
                      value={wonForm.sale_date}
                      onChange={(e) => setWonForm(prev => ({ ...prev, sale_date: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddSaleDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Adicionar Venda
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <>
              <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Trophy className="h-4 w-4 mr-2" />
                    Cliente Ganho
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Marcar Cliente como Ganho</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleMarkAsWon} className="space-y-4">
                    <div>
                      <Label htmlFor="property">Imóvel Vendido *</Label>
                      <Select
                        value={wonForm.property_id}
                        onValueChange={(value) => setWonForm(prev => ({ ...prev, property_id: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="sale_value">Valor da Venda (R$) *</Label>
                      <Input
                        id="sale_value"
                        type="number"
                        step="0.01"
                        value={wonForm.sale_value}
                        onChange={(e) => setWonForm(prev => ({ ...prev, sale_value: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sale_date">Data da Venda *</Label>
                      <Input
                        id="sale_date"
                        type="date"
                        value={wonForm.sale_date}
                        onChange={(e) => setWonForm(prev => ({ ...prev, sale_date: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowWonDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        Confirmar Venda
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <X className="h-4 w-4 mr-2" />
                    Cliente Perdido
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Marcar Cliente como Perdido</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleMarkAsLost} className="space-y-4">
                    <div>
                      <Label htmlFor="lost_reason">Motivo da Perda *</Label>
                      <Select
                        value={lostForm.reason}
                        onValueChange={(value) => setLostForm(prev => ({ ...prev, reason: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {lostReasons.filter(r => r.active).map((reason) => (
                            <SelectItem key={reason.id} value={reason.reason}>
                              {reason.reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowLostDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" variant="destructive">
                        Confirmar Perda
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
          
          <Button
            onClick={() => setEditingClient(!editingClient)}
            className="bg-primary hover:bg-primary/90"
          >
            {editingClient ? 'Cancelar' : 'Editar Cliente'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Cliente */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editingClient ? (
                <form onSubmit={handleUpdateClient} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={clientForm.full_name}
                        onChange={(e) => setClientForm(prev => ({ ...prev, full_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="funnel_status">Status</Label>
                      <Select
                        value={clientForm.funnel_status}
                        onValueChange={(value) => setClientForm(prev => ({ ...prev, funnel_status: value }))}
                        disabled={client.status === 'won' || client.status === 'lost'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FUNNEL_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage}>
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={clientForm.phone}
                        onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={clientForm.email}
                        onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={clientForm.notes}
                      onChange={(e) => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditingClient(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-primary hover:bg-primary/90">
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome Completo</Label>
                      <p className="font-medium">{client.full_name}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      {getClientStatusBadge()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Telefone</Label>
                      <div className="flex items-center gap-2">
                        <p>{client.phone || 'Não informado'}</p>
                        {client.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openWhatsApp(client.phone!)}
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <p>{client.email || 'Não informado'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Corretor Responsável</Label>
                    <p className="font-medium">{client.assigned_user?.name}</p>
                  </div>
                  
                  {client.notes && (
                    <div>
                      <Label>Observações Iniciais</Label>
                      <p className="text-sm bg-gray-50 p-3 rounded-md">{client.notes}</p>
                    </div>
                  )}

                  {/* Motivo da perda */}
                  {client.status === 'lost' && client.lost_reason && (
                    <div>
                      <Label>Motivo da Perda</Label>
                      <Badge variant="destructive">{client.lost_reason}</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendas Realizadas */}
          {client.status === 'won' && client.won_details && client.won_details.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Vendas Realizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {client.won_details.map((sale) => (
                    <div key={sale.id} className="bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{sale.property_title}</h4>
                          <p className="text-sm text-gray-600">
                            Vendido em {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            R$ {sale.sale_value.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total de Vendas:</span>
                      <span className="text-xl font-bold text-green-600">
                        R$ {client.won_details.reduce((total, sale) => total + sale.sale_value, 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Imóvel de Interesse */}
          {client.property_title && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Imóvel de Interesse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h3 className="font-medium">{client.property_title}</h3>
                  {client.property_address && (
                    <p className="text-sm text-gray-600">{client.property_address}</p>
                  )}
                  {client.property_price && (
                    <p className="text-lg font-semibold text-green-600">
                      R$ {client.property_price.toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de Interações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Histórico de Interações
              </CardTitle>
              <CardDescription>
                Todas as anotações e interações com este cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Formulário para nova nota */}
                {client.status !== 'lost' && (
                  <>
                    <form onSubmit={handleAddNote} className="space-y-3">
                      <div>
                        <Label htmlFor="new_note">Nova Anotação</Label>
                        <Textarea
                          id="new_note"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Adicione uma nova anotação sobre este cliente..."
                          rows={3}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={!newNote.trim() || isAddingNote}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isAddingNote ? 'Adicionando...' : 'Adicionar Anotação'}
                      </Button>
                    </form>

                    <Separator />
                  </>
                )}

                {/* Lista de notas */}
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma anotação registrada ainda.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">{note.user_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com informações adicionais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Data de Cadastro</Label>
                <p className="text-sm">
                  {new Date(client.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <Label>Última Atualização</Label>
                <p className="text-sm">
                  {new Date(client.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <Label>Total de Anotações</Label>
                <p className="text-sm font-medium">{notes.length}</p>
              </div>
              {client.status === 'won' && client.won_details && (
                <div>
                  <Label>Total de Vendas</Label>
                  <p className="text-sm font-medium">{client.won_details.length}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {client.phone && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openWhatsApp(client.phone!)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </Button>
              )}
              {client.email && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => window.open(`mailto:${client.email}`, '_self')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar E-mail
                </Button>
              )}
              <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Criar Tarefa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Tarefa</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                      <Label htmlFor="task_title">Título *</Label>
                      <Input
                        id="task_title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={`Tarefa para ${client.full_name}`}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="task_description">Descrição</Label>
                      <Textarea
                        id="task_description"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detalhes sobre a tarefa..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task_date">Data *</Label>
                        <Input
                          id="task_date"
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="task_time">Horário *</Label>
                        <Input
                          id="task_time"
                          type="time"
                          value={taskForm.due_time}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, due_time: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task_type">Tipo *</Label>
                        <Select
                          value={taskForm.type}
                          onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  {getTaskIcon(type)}
                                  {TASK_TYPE_LABELS[type]}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="task_priority">Prioridade *</Label>
                        <Select
                          value={taskForm.priority}
                          onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_PRIORITIES.map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                {TASK_PRIORITY_LABELS[priority]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowTaskDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                        Criar Tarefa
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleScheduleGoogleCalendar}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Agendar no Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
