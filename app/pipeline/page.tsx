"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageCircle, Building, Search, Mail, User, Calendar, Phone } from 'lucide-react';
import { Client, Property, User as UserType, FUNNEL_STAGES } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

// Mock data
const mockClients: Client[] = [
  {
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
  },
  {
    id: '2',
    full_name: 'Carlos Santos',
    phone: '(11) 88888-8888',
    email: 'carlos@email.com',
    funnel_status: 'Diagnóstico',
    notes: 'Procura casa com quintal',
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
    user_id: '1',
    property_title: 'Casa 4 quartos Jardins',
    property_address: 'Rua Augusta, 456 - Jardins',
    property_price: 1200000,
    assigned_user: { id: '1', name: 'João Corretor', email: 'joao@email.com', role: 'corretor', created_at: '2024-01-01T00:00:00Z' },
    status: 'active'
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

const mockUsers: UserType[] = [
  {
    id: '1',
    name: 'João Corretor',
    email: 'joao@email.com',
    role: 'corretor',
    created_at: '2024-01-01T00:00:00Z'
  }
];

export default function PipelinePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedUserFilter, setAssignedUserFilter] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: '',
    phone: '',
    email: '',
    funnel_status: 'Contato',
    notes: '',
    property_of_interest_id: '',
    user_id: user?.role === 'corretor' ? user.id : ''
  });

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setClients(mockClients);
      setProperties(mockProperties);
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
  }, []);

  const getFilteredClients = () => {
    let filtered = clients.filter(client => 
      !client.status || client.status === 'active'
    );

    if (searchTerm) {
      filtered = filtered.filter(client =>
        (client.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.phone || '').includes(searchTerm) ||
        (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (assignedUserFilter && assignedUserFilter !== "__all__") {
      filtered = filtered.filter(client => client.user_id === assignedUserFilter);
    }

    return filtered;
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as Client['funnel_status'];
    
    setClients(prev => 
      prev.map(client => 
        client.id === draggableId 
          ? { ...client, funnel_status: newStatus }
          : client
      )
    );
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client: Client = {
      id: Date.now().toString(),
      ...newClient,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };
    
    setClients(prev => [...prev, client]);
    setNewClient({
      full_name: '',
      phone: '',
      email: '',
      funnel_status: 'Contato',
      notes: '',
      property_of_interest_id: '',
      user_id: user?.role === 'corretor' ? user.id : ''
    });
    setShowAddClient(false);
  };

  const openWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`mailto:${email}`, '_self');
  };

  const getClientsForStage = (stage: string) => {
    return getFilteredClients().filter(client => client.funnel_status === stage);
  };

  const getStageConfig = (stage: string) => {
    const configs = {
      'Contato': { bg: 'bg-primary-custom', text: 'text-white' },
      'Diagnóstico': { bg: 'bg-tertiary-custom', text: 'text-white' },
      'Agendado': { bg: 'bg-secondary-custom', text: 'text-white' },
      'Visitado': { bg: 'bg-orange-600', text: 'text-white' },
      'Proposta': { bg: 'bg-purple-600', text: 'text-white' },
      'Contrato': { bg: 'bg-green-600', text: 'text-white' }
    };
    return configs[stage as keyof typeof configs] || { bg: 'bg-gray-600', text: 'text-white' };
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline de Vendas</h1>
            <p className="text-gray-600">Gerencie seus clientes através do funil de vendas</p>
          </div>
          
          <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
            <DialogTrigger asChild>
              <Button className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={newClient.full_name}
                    onChange={(e) => setNewClient(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="property">Imóvel de Interesse</Label>
                  <Select
                    value={newClient.property_of_interest_id || "__none__"}
                    onValueChange={(value) => setNewClient(prev => ({ ...prev, property_of_interest_id: value === "__none__" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um imóvel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione observações sobre o cliente..."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddClient(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-secondary-custom hover:bg-secondary-custom/90 text-white">
                    Adicionar Cliente
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {(searchTerm || assignedUserFilter) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setAssignedUserFilter('');
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="h-full flex">
            {FUNNEL_STAGES.map((stage) => {
              const stageConfig = getStageConfig(stage);
              const stageClients = getClientsForStage(stage);
              
              return (
                <div key={stage} className="flex-1 flex flex-col min-w-0">
                  {/* Column Header */}
                  <div className={cn(
                    "px-4 py-3 text-center border-r border-gray-200 last:border-r-0",
                    stageConfig.bg,
                    stageConfig.text
                  )}>
                    <h3 className="font-semibold text-sm">{stage}</h3>
                    <p className="text-xs opacity-90 mt-1">
                      {stageClients.length} cliente{stageClients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  {/* Column Content with Scroll */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 overflow-y-auto p-3 bg-white border-r border-gray-200 last:border-r-0",
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        )}
                        style={{ maxHeight: 'calc(100vh - 200px)' }}
                      >
                        <div className="space-y-3">
                          {stageClients.map((client, index) => (
                            <Draggable key={client.id} draggableId={client.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "cursor-pointer hover:shadow-md transition-shadow duration-200 bg-white border border-gray-200",
                                    snapshot.isDragging ? 'shadow-xl rotate-1' : ''
                                  )}
                                  onClick={() => router.push(`/client/${client.id}`)}
                                >
                                  <CardContent className="p-4">
                                    {/* Header com nome e data */}
                                    <div className="flex justify-between items-start mb-3">
                                      <h4 className="font-semibold text-gray-900 text-sm">
                                        {client.full_name}
                                      </h4>
                                      <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {new Date(client.updated_at).toLocaleDateString('pt-BR', { 
                                          day: '2-digit', 
                                          month: '2-digit' 
                                        })}
                                      </div>
                                    </div>

                                    {/* Corretor responsável */}
                                    {client.assigned_user && (
                                      <div className="flex items-center mb-3">
                                        <User className="h-3 w-3 text-gray-400 mr-1" />
                                        <span className="text-xs text-gray-600">
                                          {client.assigned_user.name}
                                        </span>
                                      </div>
                                    )}

                                    {/* Telefone */}
                                    {client.phone && (
                                      <div className="flex items-center mb-2">
                                        <Phone className="h-3 w-3 text-gray-400 mr-2" />
                                        <span className="text-xs text-gray-700">
                                          {formatPhone(client.phone)}
                                        </span>
                                        <div className="flex gap-1 ml-auto">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 hover:bg-green-100"
                                            onClick={(e) => openWhatsApp(client.phone!, e)}
                                          >
                                            <MessageCircle className="h-3 w-3 text-green-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Email */}
                                    {client.email && (
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center min-w-0 flex-1">
                                          <Mail className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                                          <span className="text-xs text-gray-700 truncate">
                                            {client.email}
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 w-6 p-0 hover:bg-gray-100 ml-2"
                                          onClick={(e) => openEmail(client.email!, e)}
                                        >
                                          <Mail className="h-3 w-3 text-gray-600" />
                                        </Button>
                                      </div>
                                    )}

                                    {/* Imóvel de interesse */}
                                    {client.property_title && (
                                      <div className="mb-3">
                                        <div className="flex items-start">
                                          <Building className="h-3 w-3 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-gray-700 mb-1">
                                              {client.property_title}
                                            </p>
                                            {client.property_address && (
                                              <p className="text-xs text-gray-500 mb-1 line-clamp-2">
                                                {client.property_address}
                                              </p>
                                            )}
                                            {client.property_price && (
                                              <p className="text-xs font-semibold text-green-600">
                                                R$ {client.property_price.toLocaleString('pt-BR')}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Observações */}
                                    {client.notes && (
                                      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-3">
                                        {client.notes}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
