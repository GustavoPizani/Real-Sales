"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Building, MapPin, DollarSign, Eye } from 'lucide-react';
import { Property, PROPERTY_TYPES, PROPERTY_STATUS } from '@/lib/types';

// Mock data
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Apartamento 3 quartos Vila Madalena',
    description: 'Lindo apartamento com varanda gourmet, 2 vagas de garagem',
    address: 'Rua Harmonia, 123 - Vila Madalena, São Paulo',
    price: 850000,
    type: 'Apartamento',
    status: 'Disponível',
    created_at: '2024-01-01T00:00:00Z',
    user_id: '1'
  },
  {
    id: '2',
    title: 'Casa 4 quartos Jardins',
    description: 'Casa térrea com quintal e piscina',
    address: 'Rua Augusta, 456 - Jardins, São Paulo',
    price: 1200000,
    type: 'Casa',
    status: 'Reservado',
    created_at: '2024-01-02T00:00:00Z',
    user_id: '1'
  },
  {
    id: '3',
    title: 'Cobertura Duplex Moema',
    description: 'Cobertura com terraço e churrasqueira',
    address: 'Av. Ibirapuera, 789 - Moema, São Paulo',
    price: 2500000,
    type: 'Cobertura',
    status: 'Vendido',
    created_at: '2024-01-03T00:00:00Z',
    user_id: '1'
  }
];

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [propertyForm, setPropertyForm] = useState({
    title: '',
    description: '',
    address: '',
    price: '',
    type: '',
    status: 'Disponível'
  });

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => {
      setProperties(mockProperties);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, typeFilter, statusFilter]);

  const filterProperties = () => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter && typeFilter !== "__clear_type__") {
      filtered = filtered.filter(property => property.type === typeFilter);
    }

    if (statusFilter && statusFilter !== "__clear_status__") {
      filtered = filtered.filter(property => property.status === statusFilter);
    }

    setFilteredProperties(filtered);
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const property: Property = {
      id: Date.now().toString(),
      title: propertyForm.title,
      description: propertyForm.description,
      address: propertyForm.address,
      price: propertyForm.price ? parseFloat(propertyForm.price) : undefined,
      type: propertyForm.type,
      status: propertyForm.status as Property['status'],
      created_at: new Date().toISOString(),
      user_id: '1'
    };
    
    setProperties(prev => [...prev, property]);
    resetForm();
    setShowAddProperty(false);
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProperty) return;

    const updatedProperty: Property = {
      ...editingProperty,
      title: propertyForm.title,
      description: propertyForm.description,
      address: propertyForm.address,
      price: propertyForm.price ? parseFloat(propertyForm.price) : undefined,
      type: propertyForm.type,
      status: propertyForm.status as Property['status']
    };
    
    setProperties(prev => 
      prev.map(property => 
        property.id === editingProperty.id ? updatedProperty : property
      )
    );
    resetForm();
    setEditingProperty(null);
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Tem certeza que deseja excluir este imóvel?')) return;
    setProperties(prev => prev.filter(property => property.id !== propertyId));
  };

  const resetForm = () => {
    setPropertyForm({
      title: '',
      description: '',
      address: '',
      price: '',
      type: '',
      status: 'Disponível'
    });
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
    setPropertyForm({
      title: property.title,
      description: property.description || '',
      address: property.address || '',
      price: property.price?.toString() || '',
      type: property.type,
      status: property.status
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Disponível': 'bg-green-100 text-green-800',
      'Reservado': 'bg-yellow-100 text-yellow-800',
      'Vendido': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Imóveis</h1>
          <p className="text-gray-600">Gerencie seu portfólio de imóveis</p>
        </div>
        
        <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Imóvel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={propertyForm.title}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Apartamento 3 quartos no Itaim Bibi"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva as características do imóvel..."
                />
              </div>
              
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={propertyForm.address}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="850000.00"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={propertyForm.type}
                    onValueChange={(value) => setPropertyForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={propertyForm.status}
                    onValueChange={(value) => setPropertyForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_STATUS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddProperty(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  Adicionar Imóvel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Imóveis</p>
                <p className="text-2xl font-bold">{properties.length}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Disponíveis</p>
                <p className="text-2xl font-bold text-green-600">
                  {properties.filter(p => p.status === 'Disponível').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reservados</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {properties.filter(p => p.status === 'Reservado').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vendidos</p>
                <p className="text-2xl font-bold text-red-600">
                  {properties.filter(p => p.status === 'Vendido').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-red-600 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar imóveis específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, endereço ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  {typeFilter && (
                    <SelectItem value="__clear_type__">Todos os tipos</SelectItem>
                  )}
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilter && (
                    <SelectItem value="__clear_status__">Todos os status</SelectItem>
                  )}
                  {PROPERTY_STATUS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || (typeFilter && typeFilter !== "__clear_type__") || (statusFilter && statusFilter !== "__clear_status__")) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('');
                  setStatusFilter('');
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Imóveis */}
      <Card>
        <CardHeader>
          <CardTitle>
            Lista de Imóveis ({filteredProperties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm || typeFilter || statusFilter
                        ? 'Nenhum imóvel encontrado com os filtros aplicados.'
                        : 'Nenhum imóvel cadastrado ainda.'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProperties.map((property) => (
                    <TableRow 
                      key={property.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/property/${property.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{property.title}</p>
                          {property.description && (
                            <p className="text-sm text-gray-600 truncate max-w-xs">
                              {property.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{property.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {property.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm truncate max-w-xs">
                              {property.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {property.price ? (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                              R$ {property.price.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">A consultar</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(property.status)}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/property/${property.id}`);
                            }}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(property);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProperty(property.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Modal de Edição */}
      <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Imóvel</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProperty} className="space-y-4">
            <div>
              <Label htmlFor="edit_title">Título *</Label>
              <Input
                id="edit_title"
                value={propertyForm.title}
                onChange={(e) => setPropertyForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit_description">Descrição</Label>
              <Textarea
                id="edit_description"
                value={propertyForm.description}
                onChange={(e) => setPropertyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva as características do imóvel..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit_address">Endereço</Label>
              <Input
                id="edit_address"
                value={propertyForm.address}
                onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_price">Preço (R$)</Label>
                <Input
                  id="edit_price"
                  type="number"
                  step="0.01"
                  value={propertyForm.price}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_type">Tipo *</Label>
                <Select
                  value={propertyForm.type}
                  onValueChange={(value) => setPropertyForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={propertyForm.status}
                  onValueChange={(value) => setPropertyForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingProperty(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
