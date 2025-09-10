// app/(app)/properties/page.tsx
"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, Edit, MapPin, DollarSign, Home, Loader2 } from "lucide-react";
import { type Imovel, StatusImovel, type TipologiaImovel } from "@/lib/types"; // CORREÇÃO: Importado StatusImovel
import { useToast } from "@/components/ui/use-toast";

const PropertiesEmptyState = dynamic(() =>
  import('./empty-state'),
  { loading: () => <Loader2 className="h-8 w-8 mx-auto my-12 animate-spin text-gray-300" /> }
);

export default function PropertiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/properties');
        if (!response.ok) {
          throw new Error("Falha ao buscar imóveis");
        }
        const data = await response.json();
        setProperties(data || []);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar a lista de imóveis.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [toast]);

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.endereco && property.endereco.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    const matchesType = typeFilter === "all" || !property.tipo || property.tipo.toLowerCase() === typeFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: StatusImovel) => {
    const variants: Record<StatusImovel, "default" | "secondary" | "destructive"> = {
      [StatusImovel.Disponivel]: "default",
      [StatusImovel.Reservado]: "secondary",
      [StatusImovel.Vendido]: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getPriceRange = (typologies: TipologiaImovel[] | undefined) => {
    if (!typologies || typologies.length === 0) {
      return "N/A";
    }
    const prices = typologies.map(t => t.valor).filter(v => v > 0);
    if (prices.length === 0) return "N/A";
    const minPrice = Math.min(...prices);
    return `A partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(minPrice)}`;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Imóveis</h1>
          <p className="text-gray-600">Gerencie todos os empreendimentos e propriedades</p>
        </div>
        <Button onClick={() => router.push('/properties/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Imóvel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value={StatusImovel.Disponivel}>Disponível</SelectItem>
                <SelectItem value={StatusImovel.Reservado}>Reservado</SelectItem>
                <SelectItem value={StatusImovel.Vendido}>Vendido</SelectItem>
              </SelectContent>
            </Select>
             <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Empreendimento">Empreendimento</SelectItem>
                <SelectItem value="Apartamento">Apartamento</SelectItem>
                <SelectItem value="Casa">Casa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lista de Imóveis</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empreendimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProperties.map((property) => (
                <TableRow key={property.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/properties/${property.id}/view`)}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{property.titulo}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.endereco || 'Endereço não informado'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Home className="h-3 w-3" />
                      {property.tipo || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(property.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      {getPriceRange(property.tipologias)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/properties/${property.id}/edit`); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredProperties.length === 0 && (
            <PropertiesEmptyState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}