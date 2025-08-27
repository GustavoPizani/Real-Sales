// app/(app)/properties/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Filter, Edit, Building, MapPin, DollarSign, Home, Link as LinkIcon, PencilLine, Loader2 } from "lucide-react";
import { type Imovel, StatusImovel } from "@/lib/types"; // CORREÇÃO: Importado StatusImovel
import { useToast } from "@/components/ui/use-toast";

export default function PropertiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [isAddOptionsOpen, setIsAddOptionsOpen] = useState(false);
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/properties', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleManualRedirect = () => {
    setIsAddOptionsOpen(false);
    router.push("/properties/new");
  };

  const handleImportRedirect = () => {
    setIsAddOptionsOpen(false);
    setIsImportUrlOpen(true);
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) {
        toast({ variant: "destructive", title: "Erro", description: "Por favor, insira um URL." });
        return;
    }
    setIsImporting(true);
    
    console.log("Simulando scraping do URL:", importUrl);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
        title: "Informações Importadas!",
        description: "Os dados foram pré-preenchidos. Por favor, reveja e complete o cadastro.",
    });

    const queryParams = new URLSearchParams({
        title: "Empreendimento Importado (Exemplo)",
        address: "Endereço extraído do link",
        price: "1250000",
    }).toString();

    setIsImporting(false);
    setIsImportUrlOpen(false);
    setImportUrl("");

    router.push(`/properties/new?${queryParams}`);
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
        <Button onClick={() => setIsAddOptionsOpen(true)}>
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
                      {formatCurrency(property.preco)}
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
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum imóvel encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou adicione um novo imóvel</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOptionsOpen} onOpenChange={setIsAddOptionsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Imóvel</DialogTitle>
            <DialogDescription>Como você gostaria de adicionar o imóvel?</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={handleManualRedirect}>
              <PencilLine className="h-6 w-6" />
              <span>Cadastro Manual</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={handleImportRedirect}>
              <LinkIcon className="h-6 w-6" />
              <span>Importar via Link</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportUrlOpen} onOpenChange={setIsImportUrlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Imóvel de um Link</DialogTitle>
            <DialogDescription>Cole o link do portal (ex: Orulo) para importar os dados automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="import-url">URL do Imóvel</Label>
            <Input 
                id="import-url" 
                placeholder="https://www.orulo.com.br/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportUrlOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportFromUrl} disabled={isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isImporting ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}